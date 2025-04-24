/**
 * Запрашивает у пользователя токен своего бота для создания магазина
 * @param {Context} ctx
 */
export async function createShopScene(ctx) {
    ctx.session.step = "token_input";

    await ctx.editMessageText("🔑 Отправьте токен вашего бота", {
        reply_markup: new InlineKeyboard().text("❌ Назад", "menu"),
    });
}

