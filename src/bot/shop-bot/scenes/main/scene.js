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
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Товары',
                        callback_data: 'products'
                    }
                ],
                [
                    {
                        text: 'Корзина',
                        callback_data: 'cart'
                    }
                ]
            ]
        }
    });
}
