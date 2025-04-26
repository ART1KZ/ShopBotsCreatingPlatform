import { Bot } from "grammy";
import { getCategories, getCart, mainScene } from "./scenes/main/scene.js";

/**
 * Возвращаяет экземпляр бота-магазина
 * @param {string} token Токен Telegram-бота
 * @returns {Bot} Экземпляр бота-магазина
 */
export function createShopBot(token) {
    const bot = new Bot(token);

    bot.command("start", async (ctx) => await mainScene(ctx));

    bot.on("callback_query:data", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        switch (callbackData) {
            case "get_products":
                await getCategories(ctx);
                break;
            case "get_cart":
                await getCart(ctx);
                break;
        }
    });
    
    return bot;
}
