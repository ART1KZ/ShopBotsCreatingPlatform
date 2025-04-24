/**
 * Отправляет меню главного бота пользователю
 * @param {Context} ctx
 * @param {boolean} isEditMessage
 * определяет, изменить последнее сообщение бота или отправить новое
 */
export async function menuScene(ctx, isEditMessage = false) {
    ctx.session.step = undefined;
    ctx.session.token = undefined;
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
