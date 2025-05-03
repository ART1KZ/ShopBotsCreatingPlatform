import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";

/**
 *
 * @param {Context} ctx
 */
export async function orderScene(ctx) {
    const { data: [product_data] } = await supabase
        .from("product_datas")
        .select("*, product:products(*, category:categories(*))")
        .eq("id", ctx.session.order.currentEntryId);

    console.log(product_data);

    const message = `
    📦 [ ${product_data.product.name} ]
    ━━━━━━━━━━━━━━
    📌 Категория: ${product_data.product.category.name}
    💵 Стоимость: ${product_data.product.price} ₽
    📝 Описание: ${product_data.product.description ?? "-"}
    🔐 Код: ${product_data.data}
    `;

    await ctx.editMessageText(message, {
        reply_markup: new InlineKeyboard().text("К заказам", "orders"),
    });
}
