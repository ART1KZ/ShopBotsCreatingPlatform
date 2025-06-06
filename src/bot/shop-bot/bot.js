import { Bot, session } from "grammy";
import { ordersScene } from "./scenes/orders/scene.js";
import { mainScene } from "./scenes/main/scene.js";
import {
    getCategories,
    getCategory,
    getProduct,
    search,
} from "./scenes/catalog/scene.js";
import { buyProductStep } from "./scenes/catalog/steps/buyProduct.js";
import { orderScene } from "./scenes/order/scene.js";

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
                order: {
                    currentEntryId: -1
                },
                catalog: {
                    currentProductId: -1,
                },
                currentBotTokenHash: undefined, // Последний введенный токен бота пользователем
            }),
        }),
    );

    bot.command("start", async (ctx) => await mainScene(ctx));

    bot.on("callback_query:data", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        switch (true) {
            case /get_categories/.test(callbackData):
                await getCategories(ctx);
                break;
            case /get_category [0-9]+/.test(callbackData):
                await getCategory(ctx);
                break;
            case /orders$/.test(callbackData):
                await ordersScene(ctx);
                break;
            case /orders_page_backward/.test(callbackData):
                if (ctx.session.orders.currentPage - 1 >= 0) {
                    ctx.session.orders.currentPage =
                        ctx.session.orders.currentPage - 1;
                    await ordersScene(ctx);
                }
                break;
            case /orders_page_forward/.test(callbackData):
                if (
                    ctx.session.orders.currentPage + 1 <=
                    ctx.session.orders.maxPage
                ) {
                    ctx.session.orders.currentPage =
                        ctx.session.orders.currentPage + 1;
                    await ordersScene(ctx);
                }
                break;
            case /order_page_by_id\:[0-9]+/.test(callbackData):
                ctx.session.order.currentEntryId = /order_page_by_id\:([0-9]+)/.exec(callbackData)[1];
                await orderScene(ctx);
                break;
            case /get_product [0-9]+/.test(callbackData):
                await getProduct(ctx);
                break;
            case /main_menu/.test(callbackData):
                await mainScene(ctx);
                break;
            case /search$/.test(callbackData):
                await search(ctx);
                break;
            case /buy [0-9]+/.test(callbackData):
                ctx.session.catalog.currentProductId = callbackData.slice(3);
                await buyProductStep(ctx);
                break;
        }
    });

    bot.on("message:text", async (ctx) => {
        if (ctx.session.step === "search_input") {
            await search(ctx);
        }
    });

    return bot;
}
