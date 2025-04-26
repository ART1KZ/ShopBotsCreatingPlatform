import { activeShopBotsHandlers } from "../../main-bot/bot.js";
import { createShopBot } from "../../shop-bot/bot.js";
import { run } from "@grammyjs/runner";
import { supabase } from "./database/index.js";
import { encryptData, decryptData } from "./encryption.js";

/**
 * Запускает бот-магазин, добавляет хендлер бота в маппинг активных ботов и изменяет поле is_active у записи с магазином в базе данных
 * @param {string} token токен Telegram-бота
 */
export async function startShopBot(token) {
    try {
        const shopBot = createShopBot(token);
        const shopBotHandler = run(shopBot);
        const botTokenHash = encryptData(token);

        await supabase
            .from("shops")
            .update({ is_active: true })
            .eq("bot_token_hash", botTokenHash)
            .neq("owner_tg_id", 741945004)

        activeShopBotsHandlers.set(token, shopBotHandler);
    } catch (error) {
        console.error("Не удалось запустить бот-магазин", error);
    }
}

/**
 * Выключает бот-магазин, удаляет хендлер бота из маппинга активных ботов и изменяет поле is_active у записи с магазином в базе данных
 * @param {string} token токен Telegram-бота
 */
export async function stopShopBot(token) {
        const shopBotHandler = activeShopBotsHandlers.get(token);
        const botTokenHash = encryptData(token);
        shopBotHandler.stop();

        await supabase
            .from("shops")
            .update({ is_active: false })
            .eq("bot_token_hash", botTokenHash);

        activeShopBotsHandlers.delete(token);
}

/**
 * Проверяет, запущен ли бот
 * @param {string} token токен Telegram-бота
 * @returns {boolean} Возвращает true, если бот запущен, иначе false.
 */
export function isShopBotRunning(token) {
    const activeBotHandler = activeShopBotsHandlers.get(token);

    if (!activeBotHandler) {
        return false;
    }

    return activeBotHandler.isRunning();
}

/**
 * Запускает всех ботов, у которых поля is_active в таблице shops равны true
 */
export async function startAllActiveBots() {
        let { data: botTokensHashes, error } = await supabase
            .from("shops")
            .select("bot_token_hash")
            .eq("is_active", true)
            .neq("owner_tg_id", 741945004)

        if (error) {
            console.error("Ошибка Supabase:", error.message, error.details);
            throw new Error(error.message);
        }

        if (!botTokensHashes || botTokensHashes.length === 0) {
            console.log("Нет активных ботов для запуска.");
            return;
        }

        for (const botTokenHash of botTokensHashes) {
            if (!botTokenHash?.bot_token_hash) {
                console.error("Некорректный botTokenHash:", botTokenHash);
                continue;
            }

                
                const botToken = decryptData(botTokenHash.bot_token_hash);
                if (!botToken) {
                    console.error("Пустой botToken для:", botTokenHash);
                    continue;
                }
                await startShopBot(botToken); // Используйте await, если startShopBot асинхронная
        }
}
