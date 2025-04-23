import { Bot } from "grammy";
import { mainScene } from "./scenes/main/scene.js";

export function createShopBot(token) {
    const bot = new Bot(token);

    bot.command("start", async (ctx) => await mainScene(ctx));

    return bot;
}
