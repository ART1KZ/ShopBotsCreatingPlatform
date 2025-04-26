import { Bot, session } from "grammy";
import { getCategories, getCart, mainScene } from "./scenes/main/scene.js";
import { ordersScene } from "./scenes/orders/scene.js";

/**
 * Возвращаяет экземпляр бота-магазина
 * @param {string} token Токен Telegram-бота
 * @returns {Bot} Экземпляр бота-магазина
 */
export function createShopBot(token) {
    const bot = new Bot(token);

    bot.use(
        session({
            initial: () => ({
                step: undefined, // Текущий этап пользователя в боте
                orders: {
                    currentPage: 0,
                    maxPage: 0,
                },
            }),
        }),
    );

    bot.command("start", async (ctx) => await mainScene(ctx));

    bot.on("callback_query:data", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        switch (callbackData) {
            case "menu":
                await mainScene(ctx, true);
                break;
            case "get_products":
                await getCategories(ctx);
                break;
            case "get_cart":
                await getCart(ctx);
                break;
            case "orders":
                await ordersScene(ctx);
                break;
            case "orders_page_backward":
                if (ctx.session.orders.currentPage - 1 >= 0) {
                    ctx.session.orders.currentPage =
                        ctx.session.orders.currentPage - 1;
                    await ordersScene(ctx);
                }
                break;
            case "orders_page_forward":
                if (
                    ctx.session.orders.currentPage + 1 <=
                    ctx.session.orders.maxPage
                ) {
                    ctx.session.orders.currentPage =
                        ctx.session.orders.currentPage + 1;
                    await ordersScene(ctx);
                }
                break;
        }
    });

    return bot;
}
