import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";
import { run } from "@grammyjs/runner";
import { activeShopBotsHandlers } from "../../bot.js";
import { encryptData } from "../../../shared/utils/encryption.js";
import { createShopBot } from "../../../shop-bot/bot.js";
import { sendUnexpectedErrorMessage } from "../../../shared/utils/error.js";

/**
 * Запрашивает у пользователя токен своего бота для создания магазина
 * @param {Context} ctx
 */
export async function createShopHandler(ctx) {
    ctx.session.step = "token_input";

    await ctx.editMessageText("🔑 Отправьте токен вашего бота", {
        reply_markup: new InlineKeyboard().text("❌ Назад", "menu"),
    });
}

/**
 * Обрабатывает введеный пользователем токен бота и создает новый магазин, если еще не существует
 * @param {Context} ctx
 */
export async function tokenInputHandler(ctx) {
    ctx.session.step = undefined;

    const userMessage = ctx.message.text.trim();
    const tokenRegex = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;

    if (!tokenRegex.test(userMessage)) {
        ctx.session.step = undefined;

        await ctx.reply(
            "😓 Неверный формат токена бота\n" +
                "👇 Он должен выглядеть примерно так:\n" +
                "<code>123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text("🔄 Повторить ввод", "create_shop")
                    .text("❌ Назад", "menu"),
            }
        );
        return;
    }

    const botTokenHash = encryptData(userMessage);
    const shopOwnerId = ctx.message.from.id;

    const { data: newShop, error } = await supabase
        .from("shops")
        .insert([{ bot_token_hash: botTokenHash, owner_tg_id: shopOwnerId }])
        .single();

    if (error) {
        // Ошибка уникальности (дублирующийся bot_token_hash)
        if (error.code === "23505") {
            await ctx.reply(
                "😓 Этот токен уже используется\n" +
                    "Используйте новый токен или удалите существующий магазин",
                {
                    reply_markup: new InlineKeyboard()
                        .text("🔑 Повторить ввод", "create_shop")
                        .text("❌ Назад", "menu"),
                }
            );
        } else {
            await sendUnexpectedErrorMessage(ctx, false, error);
        }
        return;
    }

    const shopBot = createShopBot(userMessage);
    const shopBotHandler = run(shopBot);
    activeShopBotsHandlers.set(userMessage, shopBotHandler);

    const shopBotUsername = (await shopBot.api.getMe()).username;

    await ctx.reply(
        "✅ Бот успешно создан!\n" +
            `🔗 Ссылка на бота: t.me/${shopBotUsername}`,
        {
            reply_markup: new InlineKeyboard()
                .text("⚙️ Настройка магазина", `manage_shop_${newShop.id}`)
                .row()
                .text("🏠 В главное меню", "menu"),
        }
    );
}
