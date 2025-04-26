import { Context, InlineKeyboard } from 'grammy';
import {supabase} from '../../../shared/utils/database/index.js';

/**
 * Ответ на команду /start
 * @param {Context} ctx 
 */
export async function mainScene(ctx) {
    const message = `
        Привет это магазин товаров для очень взрослых)))
    `

    await ctx.reply(message, {
        reply_markup: new InlineKeyboard()
        .text('🛍️ Каталог', 'get_products')
        .text('🛒 Корзина', 'get_products')
        .text(' Заказы', 'orders')
    });
}

/**
 * 
 * @param {Context} ctx
 */
export async function  getCategories(params) {
    const categories = await supabase
    .from('categories')
    .select()
    // .eq('shop_id', )
}

/**
 * 
 * @param {Context} ctx
 */
export async function getCart(params) {
    
}