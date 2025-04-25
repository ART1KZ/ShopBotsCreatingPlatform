import { Bot, Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";
import { decryptData } from "../../../shared/utils/encryption.js";
import { activeShopBotsHandlers } from "../../bot.js";
import { sendUnexpectedErrorMessage } from "../../../shared/utils/error.js";
import { run } from "@grammyjs/runner";

/**
 * Отправляет меню взаимодействия со списком ботов-магазинов пользователя
 * @param {Context} ctx
 */
export async function getShopsHandler(ctx) {
    const shopsKeyboard = new InlineKeyboard();
    const messageSenderId = ctx.callbackQuery.from.id;

    try {
        // Список магазинов, где текущий пользователь является владельцем
        const { data: ownerShopsHashes, error: ownerError } = await supabase
            .from("shops")
            .select("bot_token_hash")
            .eq("owner_tg_id", messageSenderId);
    
        if(ownerError) throw new Error(ownerError);
    
        for (const tokenHash of ownerShopsHashes) {
            const botToken = decryptData(tokenHash.bot_token_hash);
            const shopName = (await new Bot(botToken).api.getMe()).first_name;
            shopsKeyboard.text(`👑 ${shopName}`, `manage_shop`).row();
        }
    
        // Все записи со связью текущего пользователя с магазинами, где он администратор
        const { data: adminShopsHashes, error: adminError } = await supabase
            .from("administrators")
            .select("bot_token_hash")
            .eq("tg_user_id", messageSenderId);
    
        if(adminError) throw new Error(adminError);
    
        for (const tokenHash of adminShopsHashes) {
            const botToken = decryptData(tokenHash.bot_token_hash);
            console.log(botToken)
            const shopName = (await new Bot(botToken).api.getMe()).first_name;
            shopsKeyboard.text(`🛡️ ${shopName}`, `manage_shop`).row();
        }
    
        shopsKeyboard.text("❌ Назад", "menu");
    
        await ctx.editMessageText("🛒 Ваш список магазинов:", {
            reply_markup: shopsKeyboard,
        });
    } catch(err) {

        console.error(err);
    }
}

/**
 * Отправляет меню взаимодействия с выбранным пользователем ботом (хеш токена которого указан в сессии)
 * @param {Context} ctx
 */
export async function manageShopHandler(ctx) {
    const botToken = decryptData(ctx.session.currentBotTokenHash);
    const shop = activeShopBotsHandlers.get(ctx.session.currentBotTokenHash);
    const settingsKeyboard = new InlineKeyboard()
    const shop1 = run(botToken)
    shop1.isRunning
}