import { Context, InlineKeyboard } from "grammy";
import { encryptData } from "../../../shared/utils/encryption.js";
import { supabase } from "../../../shared/utils/database/index.js";

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

        const userId = ctx.from.id;

        const { data: user } = await supabase
            .from("users")
            .select()
            .eq("telegram_id", userId);

        if (!user[0]) {
            await supabase.from("users").insert({
                telegram_id: userId,
            });
        }

        const replyConfig = [
            message,
            {
                reply_markup: new InlineKeyboard()
                    .text("🛍️ Каталог", "get_categories")
                    .text("🛒 Покупки", "orders"),
            },
        ];

        ctx.update.callback_query
            ? await ctx.editMessageText(...replyConfig)
            : await ctx.reply(...replyConfig);
    } catch (e) {
        console.error(e);
    }
}
