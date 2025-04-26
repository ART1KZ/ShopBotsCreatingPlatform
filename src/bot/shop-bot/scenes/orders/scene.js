import { Context, InlineKeyboard } from "grammy";

/**
 *
 * @param {Context} ctx
 */
export async function ordersScene(ctx) {
    const message = `
        Список заказов
    `;

    const inlineKeyboard = generateInlineKeyboard();

    await ctx.reply(message, {
        reply_markup: inlineKeyboard,
    });
}

function generateInlineKeyboard() {
    const labelDataPairs = [
        ["<<", "orders_page_backward"],
        [">>", "orders_page_forward"],
    ];

    const buttonRow = labelDataPairs.map(([label, data]) =>
        InlineKeyboard.text(label, data),
    );

    return new InlineKeyboard([buttonRow]);
}
