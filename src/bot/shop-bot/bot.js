import { Bot } from "grammy";
import { mainScene } from "./scenes/main/scene.js";

/**
 * Возвращаяет экземпляр бота-магазина
 * @param {string} token Токен Telegram-бота
 * @returns {Bot} Экземпляр бота-магазина
 */
export function createShopBot(token) {
    const bot = new Bot(token);

    bot.command("start", async (ctx) => await mainScene(ctx));

    return bot;
}
