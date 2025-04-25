import { Bot, Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";
import { decryptData } from "../../../shared/utils/encryption.js";

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
            shopsKeyboard.text(`👑 ${shopName}`, `menu`).row();
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
            shopsKeyboard.text(`🛡️ ${shopName}`, `menu`).row();
        }
    
        shopsKeyboard.text("❌ Назад", "menu");
    
        await ctx.editMessageText("🛒 Ваш список магазинов:", {
            reply_markup: shopsKeyboard,
        });
    } catch(err) {
        console.error(err);
    }
}
