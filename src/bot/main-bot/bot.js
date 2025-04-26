import { Bot, session } from "grammy";
import { menuHandler } from "./scenes/main/scene.js";
import {
    sendDontUnderstandErrorMessage
} from "../shared/utils/error.js";
import { createShopHandler, tokenInputHandler } from "./scenes/adding-shop/scene.js";
import { getShopsHandler, manageShopHandler } from "./scenes/selecting-shop/scene.js";
import { toggleBotHandler } from "./scenes/editing-shop/scene.js";


export const bot = new Bot(process.env.BOT_TOKEN);

// Текущие боты магазины
export const activeShopBotsHandlers = new Map();

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            currentBotToken: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await menuHandler(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (true) {
        case callbackData === "menu":
            await menuHandler(ctx, true);
            break;
        
        case callbackData === "create_shop":
            await createShopHandler(ctx);
            break;
        case callbackData === "get_shops":
            await getShopsHandler(ctx);
            break;
        case callbackData.startsWith("manage_shop"):
            await manageShopHandler(ctx);
            break;
        case callbackData.startsWith("toggle_bot"):
            await toggleBotHandler(ctx);
            break;
    }

    await ctx.answerCallbackQuery();
});

bot.on("message", async (ctx) => {
    switch (ctx.session.step) {
        case "token_input":
            await tokenInputHandler(ctx);
            break;
        default:
            await sendDontUnderstandErrorMessage(ctx);
            break;
    }
});

bot.catch((error) => {
    console.log("Ошибка в боте", error);
});
