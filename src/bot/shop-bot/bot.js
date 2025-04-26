import { Bot, session } from "grammy";
import { mainScene } from "./scenes/main/scene.js";
import { getCategories, getCategory, getProduct, search } from "./scenes/catalog/scene.js";

/**
 * Возвращаяет экземпляр бота-магазина
 * @param {string} token Токен Telegram-бота
 * @returns {Bot} Экземпляр бота-магазина
 */
export function createShopBot(token) {
    const bot = new Bot(token);
    // console.log(ctx)

    bot.use(
        session({
            initial: () => ({
                step: undefined, // Текущий этап пользователя в боте
                currentBotTokenHash: undefined, // Последний введенный токен бота пользователем
            }),
        })
    );

    bot.command("start", async (ctx) => await mainScene(ctx));

    bot.on("callback_query:data", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        console.log(callbackData)

        switch (true) {
            case /get_categories/.test(callbackData):
                await getCategories(ctx);
                break;
            case /get_category [0-9]+/.test(callbackData):
                console.log('checked')
                await getCategory(ctx);
                break;
            case /get_product [0-9]+/.test(callbackData):
                getProduct(ctx);
                break;
            case /main_menu/.test(callbackData):
                await mainScene(ctx);
                break;
            case /search/.test(callbackData):
                await search(ctx);
                break;
            // case "get_cart":
            //     await getCart(ctx);
            //     break;
        }
    });

    bot.on("message:text", async (ctx) => {
        if (ctx.session.step === "search_input") {
            await search(ctx);
        }
    });
    
    return bot;
}
