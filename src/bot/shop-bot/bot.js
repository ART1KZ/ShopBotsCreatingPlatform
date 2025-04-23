import { Bot } from "grammy";
import { mainScene } from "./scenes/main/scene";

export function createShopBot(token) {
    const bot = new Bot(token);

    bot.command("start", mainScene);

    return bot;
}
