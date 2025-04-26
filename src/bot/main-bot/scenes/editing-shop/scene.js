import { Context } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";
import { decryptData } from "../../../shared/utils/encryption.js";
import {
    startShopBot,
    stopShopBot,
} from "../../../shared/utils/shopBotsManager.js";
import { manageShopHandler } from "../selecting-shop/scene.js"

/**
 * Включает или выключает бота. Изменяет текущие данные бота в настройках на новые.
 * @param {Context} ctx
 */
export async function toggleBotHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[2];
    const isToggleBotOn = callbackDataParts[3] === "on";
    
    const { data: shop } = await supabase
        .from("shops")
        .select("bot_token_hash")
        .eq("id", shopId)
        .single();

    const shopBotToken = decryptData(shop.bot_token_hash);
    isToggleBotOn ? await startShopBot(shopBotToken) : await stopShopBot(shopBotToken);

    ctx.callbackQuery.data = `manage_shop_${shopId}`;
    await manageShopHandler(ctx);
}
