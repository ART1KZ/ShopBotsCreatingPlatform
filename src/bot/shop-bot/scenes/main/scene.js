import { Context, InlineKeyboard } from 'grammy';
import {supabase} from '../../../shared/utils/database/index.js';
import { encryptData } from '../../../shared/utils/encryption.js';
/**
 * Ответ на команду /start
 * @param {Context} ctx 
 */
export async function mainScene(ctx) {
    try {
        ctx.session.currentBotTokenHash = encryptData(ctx.api.token);

        const message = `
            Добро пожаловать в магазин!
        `
        console.log(ctx)
        if (ctx.update.callback_query) {
            await ctx.editMessageText(message, {
                reply_markup: new InlineKeyboard()
                .text('🛍️ Каталог', 'get_categories')
                .text('🛒 Корзина', 'get_cart')
                .text(' Заказы', 'get_orders')
            })
        } else {
            await ctx.reply(message, {
                reply_markup: new InlineKeyboard()
                .text('🛍️ Каталог', 'get_categories')
                .text('🛒 Корзина', 'get_cart')
                .text(' Заказы', 'get_orders')
            });
        }
    }
    catch (error) {
        console.error(error);
    }
}