import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../../shared/utils/database/index.js";

/**
 *
 * @param {Context} ctx
 */
export async function buyProductStep(ctx) {
    const userId = ctx.callbackQuery.from.id;

    // получение предмета купли-продажи
    const { data: product_data } = await supabase
        .from("product_datas")
        .select("*, product:products(*, category:categories(*, shop:shops(*)))")
        .eq("product_id", ctx.session.catalog.currentProductId)
        .is("reservedBy", null)
        .limit(1);

    if (!product_data[0])
        return ctx.editMessageText("Ошибка, товар не найден.", {
            reply_markup: new InlineKeyboard().text("На главную", "main_menu"),
        });

    // резервирование
    await supabase
        .from("product_datas")
        .update({
            reservedBy: userId,
        })
        .eq("id", product_data[0].id);

    await supabase.from("purchases").insert({
        customer_tg_id: userId,
        product_data_id: product_data[0].id,
        shop_id: product_data[0].product.category.shop.id,
    });

    await ctx.editMessageText("Покупка прошла успешно!", {
        reply_markup: new InlineKeyboard().text("На главную", "main_menu"),
    });
}
