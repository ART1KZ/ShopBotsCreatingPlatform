import { Context, InlineKeyboard } from "grammy";

/**
 * Отправляет пользователю сообщение с непредвиденой ошибкой
 * @param {Context} ctx
 * @param {boolean} isEditMessage
 * определяет, изменить последнее сообщение бота или отправить новое
 * @param {object} error
 * объект ошибки
 */
export async function sendUnexpectedErrorMessage(
    ctx,
    isEditMessage = false,
    error = undefined
) {
    if (error) console.error(error);

    const message = "⚠️ Непредвиденная ошибка. Попробуйте еще раз";
    const menuKeyboard = new InlineKeyboard().row({
        text: "🏠 В главное меню",
        callback_data: "menu",
    });

    if (!isEditMessage)
        return await ctx.reply(message, { reply_markup: menuKeyboard });
    else
        return await ctx.editMessageText(
            "<b>⚠️ Непредвиденная ошибка. Попробуйте еще раз</b>",
            { reply_markup: menuKeyboard }
        );
}

/**
 * Отправляет пользователю сообщение о непонимании сообщения
 * @param {Context} ctx
 */
export async function sendDontUnderstandErrorMessage(ctx) {
    return await ctx.reply("🤔 Не понял, что вы имеете ввиду", {
        reply_markup: new InlineKeyboard().row({
            text: "🏠 В главное меню",
            callback_data: "menu",
        })
    });
}
