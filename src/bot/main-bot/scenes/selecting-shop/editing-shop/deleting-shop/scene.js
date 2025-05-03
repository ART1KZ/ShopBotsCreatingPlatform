import { supabase } from "../../../../../shared/utils/database/index.js";
import { Context, InlineKeyboard } from "grammy";
import { decryptData } from "../../../../../shared/utils/encryption.js";
import { Bot } from "grammy";
import { activeShopBotsHandlers } from "../../../../bot.js";
import { isShopBotRunning, stopShopBot } from "../../../../../shared/utils/shopBotsManager.js";

// ... (существующий код getShopsHandler и manageShopHandler остаётся без изменений)

/**
 * Запрашивает подтверждение удаления магазина
 * @param {Context} ctx
 */
export async function deleteShopHandler(ctx) {
    const shopId = ctx.callbackQuery.data.split("_")[2];

    const { data: shop, error } = await supabase
        .from("shops")
        .select("bot_token_hash")
        .eq("id", shopId)
        .single();

    if (error || !shop) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nМагазин не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    const botToken = decryptData(shop.bot_token_hash);
    const shopName = (await new Bot(botToken).api.getMe()).first_name;

    const keyboard = new InlineKeyboard()
        .text("✅ Подтвердить удаление", `confirm_delete_shop_${shopId}`)
        .text("❌ Отменить", `manage_shop_${shopId}`);

    await ctx.editMessageText(
        `<b>🗑️ Удаление магазина</b>\nВы уверены, что хотите удалить магазин <b>${shopName}</b>? Это действие нельзя отменить.`,
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Обрабатывает подтверждение или отмену удаления магазина
 * @param {Context} ctx
 */
export async function confirmDeleteShopHandler(ctx) {
    const shopId = ctx.callbackQuery.data.split("_")[3];

    const { data: shop, error } = await supabase
        .from("shops")
        .select("bot_token_hash")
        .eq("id", shopId)
        .single();

    if (error || !shop) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nМагазин не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    const botToken = decryptData(shop.bot_token_hash);
    const shopName = (await new Bot(botToken).api.getMe()).first_name;

    // Останавливаем бот, если он активен
    if (isShopBotRunning(botToken)) {
        await stopShopBot(botToken);
    }

    // Удаляем связанные данные
    try {
        await supabase.from("purchases").delete().eq("shop_id", shopId);
        await supabase.from("user_chats").delete().eq("shop_id", shopId);
        await supabase.from("product_datas").delete().in("product_id", (
            await supabase.from("products").select("id").eq("category_id", (
                await supabase.from("categories").select("id").eq("shop_id", shopId)
            ).data.map(cat => cat.id))
        ).data.map(prod => prod.id));
        await supabase.from("products").delete().in("category_id", (
            await supabase.from("categories").select("id").eq("shop_id", shopId)
        ).data.map(cat => cat.id));
        await supabase.from("categories").delete().eq("shop_id", shopId);
        await supabase.from("administrators").delete().eq("shop_id", shopId);
        await supabase.from("shops").delete().eq("id", shopId);

        await ctx.editMessageText(
            `<b>✅ Успех!</b>\nМагазин <b>${shopName}</b> успешно удалён.`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🛒 К списку магазинов", "get_shops"),
            }
        );
    } catch (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось удалить магазин: ${error.message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
    }
}