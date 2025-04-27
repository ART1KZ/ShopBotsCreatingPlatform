import { Context, InlineKeyboard } from "grammy";
import { encryptData } from "../../../shared/utils/encryption.js";

/**
 * Ответ на команду /start
 * @param {Context} ctx
 */
export async function mainScene(ctx) {
    try {
        ctx.session.currentBotTokenHash = encryptData(ctx.api.token);

        const message = `
            Добро пожаловать в магазин!
        `;

        const replyConfig = [
            message,
            {
                reply_markup: new InlineKeyboard()
                    .text("🛍️ Каталог", "get_categories")
                    .text(" Заказы", "orders"),
            },
        ];

        ctx.update.callback_query
            ? await ctx.editMessageText(...replyConfig)
            : await ctx.reply(...replyConfig);
    } catch (e) {
        console.error(e);
    }
}
