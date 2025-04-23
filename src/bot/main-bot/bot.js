import { Bot, InlineKeyboard, session, Context } from "grammy";
import { decryptData, encryptData } from "../shared/utils/encryption.js";
import { createClient } from "@supabase/supabase-js";
import { createShopBot } from "../shop-bot/bot.js";
import {
    sendDontUnderstandErrorMessage,
    sendUnexpectedErrorMessage,
} from "../shared/utils/error.js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export const bot = new Bot(process.env.BOT_TOKEN);

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            token: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await menuScene(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (callbackData) {
        case "menu":
            await menuScene(ctx, true);
            break;
        case "create_shop":
            await createShopScene(ctx);
            break;
        case "get_shops":
            await getShopsScene(ctx);
            break;
    }

    await ctx.answerCallbackQuery();
});

bot.on("message", async (ctx) => {
    switch (ctx.session.step) {
        case "token_input":
            await tokenInputScene(ctx);
            break;
        default:
            await sendDontUnderstandErrorMessage(ctx);
            break;
    }
});

bot.catch((error) => {
    console.log("Ошибка в боте", error);
    // sendUnexpectedErrorMessage(ctx, false, error);
});

/**
 * Отправляет меню взаимодействия со списком ботов-магазинов пользователя
 * @param {Context} ctx
 */
async function getShopsScene(ctx) {
    const shopsKeyboard = new InlineKeyboard();

    const messageSenderId = ctx.callbackQuery.from.id;

    // Список магазинов, где текущий пользователь является владельцем
    const ownerShops = await supabase
        .from("shops")
        .select("*")
        .eq("owner_tg_id", messageSenderId);

    for (let shop of ownerShops.data) {
        shopsKeyboard.text(`👑 ${shop.name}`, `menu`).row();
    }

    const adminShops = [];
    // TODO: реализовать поиск магазинов, где пользователь является администратором

    // Все записи со связью текущего пользователя с магазинами, где он администратор
    // const adminRelations = await supabase
    //     .from("administrators")
    //     .select("*")
    //     .eq("tg_user_id", messageSenderId);

    // for(let botTokenHash of adminRelations.data.bot_token_hash) {
    //     // Получаем информацию о магазине по хэшу токена
    //     const shopInfo = await supabase
    //         .from("shops")
    //         .select("*")
    //         .eq("bot_token_hash", botTokenHash);
        
    //     adminShops.push(shopInfo.data);
    // }

    // for (let shop of adminShops) {
    //     shopsKeyboard.text(`🛡️ ${shop.name}`, `menu`).row();
    // }

    shopsKeyboard.text("❌ Назад", "menu");

    await ctx.editMessageText("🛒 Ваш список магазинов:", {
        reply_markup: shopsKeyboard,
    });
}

/**
 * Отправляет меню главного бота пользователю
 * @param {Context} ctx
 * @param {boolean} isEditMessage
 * определяет, изменить последнее сообщение бота или отправить новое
 */
async function menuScene(ctx, isEditMessage = false) {
    ctx.session.step = undefined;
    ctx.session.token = undefined;
    const keyboard = new InlineKeyboard()
        .text("🏬 Создать магазин", "create_shop")
        .row()
        .text("🛍️ Мои магазины", "get_shops");

    const message =
        "👋 Добро пожаловать!\n" +
        "🚀 Создавайте и управляйте своими магазинами в Telegram легко и быстро!\n" +
        "Выберите действие ниже 👇";

    if (isEditMessage) {
        await ctx.editMessageText(message, {
            reply_markup: keyboard,
        });
    } else {
        await ctx.reply(message, {
            reply_markup: keyboard,
        });
    }
}

/**
 * Запрашивает у пользователя токен своего бота для создания магазина
 * @param {Context} ctx
 */
async function createShopScene(ctx) {
    ctx.session.step = "token_input";

    await ctx.editMessageText("🔑 Отправьте токен вашего бота", {
        reply_markup: new InlineKeyboard().text("❌ Назад", "menu"),
    });
}

/**
 * Обрабатывает введеный пользователем токен бота и создает новый магазин, если еще не существует
 * @param {Context} ctx
 */
async function tokenInputScene(ctx) {
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

    const { error } = await supabase
        .from("shops")
        .insert([{ bot_token_hash: botTokenHash, owner_tg_id: shopOwnerId }]);

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
            await sendUnexpectedErrorMessage(ctx, error);
        }
        return;
    }

    const shopBot = createShopBot(userMessage);
    shopBot.start();

    const shopBotUsername = (await shopBot.api.getMe()).username;

    await ctx.reply(
        "✅ Бот успешно создан!\n" +
            `🔗 Ссылка на бота: t.me/${shopBotUsername}`,
        {
            reply_markup: new InlineKeyboard().text(
                "🏠 В главное меню",
                "menu"
            ),
        }
    );
}
