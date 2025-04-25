import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";

/**
 * Отправляет меню взаимодействия со списком ботов-магазинов пользователя
 * @param {Context} ctx
 */
export async function getShopsHandler(ctx) {
    const shopsKeyboard = new InlineKeyboard();

    const messageSenderId = ctx.callbackQuery.from.id;

    // Список магазинов, где текущий пользователь является владельцем
    const ownerShops = await supabase
        .from("shops")
        .select("*")
        .eq("owner_tg_id", messageSenderId);

    for (const shop of ownerShops.data) {
        shopsKeyboard.text(`👑 ${shop.name}`, `menu`).row();
    }

    // Все записи со связью текущего пользователя с магазинами, где он администратор
    const adminRelations = await supabase
        .from("administrators")
        .select("*")
        .eq("tg_user_id", messageSenderId);

    const adminShopTokenHashes = [];

    for (const relation of adminRelations.data) {
        // Получаем информацию о магазине по хэшу токена
        adminShopTokenHashes.push(relation.bot_token_hash);
    }

    const adminShops = await supabase
        .from("shops")
        .select("*")
        .in("bot_token_hash", adminShopTokenHashes);

    for (const shop of adminShops.data) {
        shopsKeyboard.text(`🛡️ ${shop.name}`, `menu`).row();
    }

    shopsKeyboard.text("❌ Назад", "menu");

    await ctx.editMessageText("🛒 Ваш список магазинов:", {
        reply_markup: shopsKeyboard,
    });
}