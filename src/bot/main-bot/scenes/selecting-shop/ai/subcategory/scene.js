import { supabase } from "../../../../../shared/utils/database/index.js";
import { Context, InlineKeyboard } from "grammy";
import { sendRequestToMistralAgent } from "../../../../../shared/utils/ai-api.js";
import { decryptData } from "../../../../../shared/utils/encryption.js";
import { Bot } from "grammy";

/**
 * Генерирует подкатегорию и возвращает меню с предложением добавления подкатегории
 * @param {Context} ctx
 */
export async function generateSubcategoryHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[2];
    const parentCategoryId = callbackDataParts[3];

    // Получаем информацию о магазине
    let { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("bot_token_hash")
        .eq("id", shopId)
        .single();

    if (shopError || !shop) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nМагазин не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    // Получаем название родительской категории
    let { data: parentCategory, error: parentError } = await supabase
        .from("categories")
        .select("name")
        .eq("id", parentCategoryId)
        .eq("shop_id", shopId)
        .single();

    if (parentError || !parentCategory) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nРодительская категория не найдена.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    // Получаем существующие подкатегории
    let { data: subcategories, error: subcategoriesError } = await supabase
        .from("categories")
        .select("name")
        .eq("shop_id", shopId)
        .eq("parent_id", parentCategoryId);

    if (subcategoriesError) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось загрузить подкатегории.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    // Получаем название магазина через Telegram API
    const shopBotToken = decryptData(shop.bot_token_hash);
    let shopName;
    try {
        shopName = (await new Bot(shopBotToken).api.getMe()).first_name;
    } catch (error) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось получить название магазина.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    // Формируем JSON для запроса к агенту
    const requestJson = {
        shop_name: shopName,
        parent_category: parentCategory.name,
        subcategories: subcategories.map((cat) => cat.name),
    };

    try {
        // Отправляем запрос к агенту Mistral
        const response = await sendRequestToMistralAgent(
            process.env.GENERATE_SUBCATEGORY_AGENT_ID,
            {
                ...requestJson,
            }
        );

        if (response.error_message) {
            await ctx.editMessageText(
                `<b>❌ Не удалось сгенерировать подкатегорию</b>\n${response.error_message}`,
                {
                    parse_mode: "HTML",
                    reply_markup: new InlineKeyboard()
                        .text("🔙 Вернуться к категориям", `get_categories_${shopId}`)
                        .text("🏠 В главное меню", "menu"),
                }
            );
            return;
        }

        const newSubcategory = response.subcategory.split(" ").join("_");

        // Формируем меню с подтверждением
        const keyboard = new InlineKeyboard()
            .text(
                "✅ Добавить подкатегорию",
                `generate_subcategory_confirm_${shopId}_${parentCategoryId}_${newSubcategory}`
            )
            .text("❌ Отклонить", `get_categories_${shopId}`)
            .row()
            .text("🏠 В главное меню", "menu");

        await ctx.editMessageText(
            `<b>📍 Текущая позиция:</b> Генерация подкатегории\n<b>🏪 Магазин:</b> ${shopName}\n<b>📁 Родительская категория:</b> ${parentCategory.name}\n<b>➕ Предложенная подкатегория:</b> ${newSubcategory.split("_").join(" ")}\nХотите добавить эту подкатегорию?`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
    } catch (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось сгенерировать подкатегорию: ${error.message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text("🔙 Вернуться к категориям", `get_categories_${shopId}`)
                    .text("🏠 В главное меню", "menu"),
            }
        );
    }
}

/**
 * Обрабатывает подтверждение или отклонение сгенерированной подкатегории
 * @param {Context} ctx
 */
export async function generateSubcategoryAcceptHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[3];
    const parentCategoryId = callbackDataParts[4];
    let newSubcategory = callbackDataParts.slice(5).join(" ");

    // Добавляем подкатегорию в базу данных
    const { error } = await supabase
        .from("categories")
        .insert([
            {
                name: newSubcategory,
                shop_id: shopId,
                parent_id: parentCategoryId,
            },
        ])
        .select();

    if (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось добавить подкатегорию <b>"${newSubcategory}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text("🔙 Вернуться к категориям", `manage_category_${parentCategoryId}_${shopId}`)
                    .text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    ctx.session.step = undefined;
    await ctx.editMessageText(
        `<b>✅ Успех!</b>\nПодкатегория <b>"${newSubcategory}"</b> успешно добавлена.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
                .text("🔙 Вернуться к подкатегориям", `manage_category_${parentCategoryId}_${shopId}`)
                .text("🏠 В главное меню", "menu"),
        }
    );
}