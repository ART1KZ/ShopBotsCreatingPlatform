import { Context } from 'grammy';

/**
 * 
 * @param {Context} ctx 
 */
export async function mainScene(ctx) {
    const message = `
        Привет это магазин товаров для очень взрослых)))
    `

    await ctx.reply(message, {
        reply_markup: new InlineKeyboard().text('🛍️ Мои товары', 'get_products')
    });
}
