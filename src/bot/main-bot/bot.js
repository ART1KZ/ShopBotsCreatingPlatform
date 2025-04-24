import { Bot, InlineKeyboard, session, Context } from "grammy";
import { decryptData, encryptData } from "../shared/utils/encryption.js";
import { createClient } from "@supabase/supabase-js";
import { createShopBot } from "../shop-bot/bot.js";
import {
    sendDontUnderstandErrorMessage,
    sendUnexpectedErrorMessage,
} from "../shared/utils/error.js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export const bot = new Bot(process.env.BOT_TOKEN);

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            token: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await menuScene(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (callbackData) {
        case "menu":
            await menuScene(ctx, true);
            break;
        case "create_shop":
            await createShopScene(ctx);
            break;
        case "get_shops":
            await getShopsScene(ctx);
            break;
    }

    await ctx.answerCallbackQuery();
});

bot.on("message", async (ctx) => {
    switch (ctx.session.step) {
        case "token_input":
            await tokenInputScene(ctx);
            break;
        default:
            await sendDontUnderstandErrorMessage(ctx);
            break;
    }
});

bot.catch((error) => {
    console.log("Ошибка в боте", error);
    // sendUnexpectedErrorMessage(ctx, false, error);
});

