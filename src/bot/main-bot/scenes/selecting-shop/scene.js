import { Bot, Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";
import { decryptData, encryptData } from "../../../shared/utils/encryption.js";
import { activeShopBotsHandlers } from "../../bot.js";
import { sendUnexpectedErrorMessage } from "../../../shared/utils/error.js";
import { run } from "@grammyjs/runner";
import { isShopBotRunning } from "../../../shared/utils/shopBotsManager.js";

/**
 * Отправляет меню взаимодействия со списком ботов-магазинов пользователя
 * @param {Context} ctx
 */
export async function getShopsHandler(ctx) {
    const shopsKeyboard = new InlineKeyboard();
    const messageSenderId = ctx.callbackQuery.from.id;
    // Массив магазинов, где текущий пользователь является владельцем
    const { data: ownerShops, error: ownerError } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_tg_id", messageSenderId);

    if (ownerError) throw new Error(ownerError);

    for (const shop of ownerShops) {
        const botToken = decryptData(shop.bot_token_hash);
        const shopName = (await new Bot(botToken).api.getMe()).first_name;
        const botStatusEmoji = isShopBotRunning(botToken) ? "🟢" : "🔴";
        shopsKeyboard
            .text(
                `${botStatusEmoji} ${shopName} (Владелец)`,
                `manage_shop_${shop.id}`
            )
            .row();
    }

    // Массив id магазинов, где пользователь является админом
    const { data: adminShopIds, error: adminIdsError } = await supabase
        .from("administrators")
        .select("shop_id")
        .eq("tg_user_id", messageSenderId);

    if (adminIdsError) throw new Error(adminIdsError);

    // Массив магазинов, где текущий пользователь является админом
    const { data: adminShops, error: adminError } = await supabase
        .from("shops")
        .select("*")
        .in("id", adminShopIds);

    if (adminError) throw new Error(adminError);

    for (const shop of adminShops) {
        const botToken = decryptData(shop.bot_token_hash);
        const shopName = (await new Bot(botToken).api.getMe()).first_name;
        const botStatusEmoji = isShopBotRunning(botToken) ? "🟢" : "🔴";
        shopsKeyboard
            .text(
                `${botStatusEmoji} ${shopName} (Администратор)`,
                `manage_shop_${shop.id}}`
            )
            .row();
    }
    shopsKeyboard.text("❌ Назад", "menu");

    await ctx.editMessageText("🛒 Ваш список магазинов:", {
        reply_markup: shopsKeyboard,
    });
}

/**
 * Отправляет меню взаимодействия с конкретным магазином, который выбрал пользователь
 * @param {Context} ctx
 */
export async function manageShopHandler(ctx) {
    const shopId = ctx.callbackQuery.data.split("_")[2];

    const settingsKeyboard = new InlineKeyboard();

    let { data: shopBotData } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

    const botToken = decryptData(shopBotData.bot_token_hash);
    const isActive = isShopBotRunning(botToken);
    const shopStatus = isActive ? "Включен ✅" : "Выключен ❌";

    const telegramShopData = await new Bot(botToken).api.getMe();

    settingsKeyboard
        .text(
            isActive ? "🛑 Выключить бота" : "🟢 Включить бота",
            isActive ? `toggle_bot_${shopId}_off` : `toggle_bot_${shopId}_on`
        )
        .text(`🗂️ Управление сущностями`, `get_categories_${shopId}`)
        .row();

    settingsKeyboard.text("❌ Назад", "get_shops");
    await ctx.editMessageText(
        `<b>🏬 Имя магазина:</b> ${telegramShopData.first_name}\n` +
            `<b>🔗 Ссылка:</b> t.me/${telegramShopData.username}\n` +
            `<b>📊 Статус:</b> ${shopStatus}\n` +
            `<b>🔑 Токен:</b> <tg-spoiler>${botToken}</tg-spoiler>`,
        {
            reply_markup: settingsKeyboard,
            parse_mode: "HTML",
        }
    );
}
