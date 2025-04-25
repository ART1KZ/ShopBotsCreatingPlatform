import { Bot, session } from "grammy";
import { decryptData, encryptData } from "../shared/utils/encryption.js";
import { menuHandler } from "./scenes/main/scene.js";
import {
    sendDontUnderstandErrorMessage,
    sendUnexpectedErrorMessage,
} from "../shared/utils/error.js";
import { createShopHandler, tokenInputHandler } from "./scenes/adding-shop/scene.js";
import { getShopsHandler } from "./scenes/manage-shops/scene.js";


export const bot = new Bot(process.env.BOT_TOKEN);

// Текущие боты магазины
export const activeShopBotsHandlers = new Map();

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            currentBotTokenHash: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await menuHandler(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (callbackData) {
        case "menu":
            await menuHandler(ctx, true);
            break;
        case "create_shop":
            await createShopHandler(ctx);
            break;
        case "get_shops":
            await getShopsHandler(ctx);
            break;
        case "manage_shop":
            await manageShopHandler(ctx);
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
    console.log("Ошибка в боте", JSON.stringify(error));
});
