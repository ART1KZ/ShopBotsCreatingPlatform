import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";

/**
 * Отправляет меню главного бота пользователю
 * @param {Context} ctx
 * @param {boolean} isEditMessage
 * определяет, изменить последнее сообщение бота или отправить новое
 */
export async function menuHandler(ctx, isEditMessage = false) {
    ctx.session.step = undefined;
    ctx.session.token = undefined;

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

    const keyboard = new InlineKeyboard()
        .text("🏬 Создать магазин", "create_shop")
        .row()
        .text("🛍️ Мои магазины", "get_shops");

    const message =
        "<b>👋 Добро пожаловать!</b>\n\n" +
        "🚀 Создавайте и управляйте своими магазинами в Telegram легко и быстро!\n" +
        "Выберите действие ниже 👇";

    if (isEditMessage) {
        await ctx.editMessageText(message, {
            reply_markup: keyboard,
            parse_mode: "HTML",
        });
    } else {
        await ctx.reply(message, {
            reply_markup: keyboard,
            parse_mode: "HTML",
        });
    }
}
