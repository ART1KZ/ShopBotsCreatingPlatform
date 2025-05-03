import { supabase } from "../../../../../shared/utils/database/index.js";
import { Context, InlineKeyboard } from "grammy";
import { sendRequestToMistralAgent } from "../../../../../shared/utils/ai-api.js";
import { decryptData } from "../../../../../shared/utils/encryption.js";
import { Bot } from "grammy";

/**
 * Генерирует категорию и возвращает меню с предложением добавления категории
 * @param {Context} ctx
 */
export async function generateCategoryHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[2];

    // Получаем информацию о магазине
    let { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("bot_token_hash")
        .eq("id", shopId)
        .single();

    if (shopError || !shop) {
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nМагазин не найден.", {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text(
                "🏠 В главное меню",
                "menu"
            ),
        });
        return;
    }

    // Получаем существующие категории
    let { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("name")
        .eq("shop_id", shopId)
        .is("parent_id", null); // Только категории верхнего уровня

    if (categoriesError) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось загрузить категории магазина.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text(
                    "🏠 В главное меню",
                    "menu"
                ),
            }
        );
        return;
    }

    const shopBotToken = decryptData(shop.bot_token_hash);
    const shopName = (await new Bot(shopBotToken).api.getMe()).first_name;
    // Формируем JSON для запроса к агенту
    const requestJson = {
        shop_name: shopName,
        categories: categories.map((cat) => cat.name),
    };

    // Отправляем запрос к агенту Mistral
    const response = await sendRequestToMistralAgent(
        process.env.GENERATE_CATEGORY_AGENT_ID,
        requestJson
    );

    if (response.error_message) {
        await ctx.editMessageText(
            `<b>❌ Не удалось сгенерировать категорию</b>:\n` +
                `${response.error_message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text(
                        "🔙 Вернуться к категориям",
                        `get_categories_${shopId}`
                    )
                    .text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    const newCategory = response.category.split(' ').join('_');;

    // Формируем меню с подтверждением
    const keyboard = new InlineKeyboard()
        .text(
            "✅ Добавить категорию",
            `generate_category_confirm_${shopId}_${newCategory}`
        )
        .text("❌ Отклонить", `get_categories_${shopId}`)
        .row()
        .text("🏠 В главное меню", "menu");

    await ctx.editMessageText(
        `<b>📍 Текущая позиция:</b> Категории\n<b>🏪 Магазин:</b> ${shopName}\n<b>➕ Предложенная категория:</b> ${newCategory.split("_").join(" ")}\n` + `Хотите добавить эту категорию?`,
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Обрабатывает подтверждение или отклонение сгенерированной категории
 * @param {Context} ctx
 */
export async function generateCategoryAcceptHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");

    const shopId = callbackDataParts[3];
    let newCategory = "";

    for(let i = 4; i < callbackDataParts.length; i++) {
        newCategory += callbackDataParts[i] + ' ';
    }

    // Добавляем категорию в базу данных
    const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategory, shop_id: shopId }])
        .select();

    if (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось добавить категорию <b>"${newCategory}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text(
                        "🔙 Вернуться к категориям",
                        `get_categories_${shopId}`
                    )
                    .text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    ctx.session.step = undefined;
    await ctx.editMessageText(
        `<b>✅ Успех!</b>\nКатегория <b>"${newCategory}"</b> успешно добавлена.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
                .text("🔙 Вернуться к категориям", `get_categories_${shopId}`)
                .text("🏠 В главное меню", "menu"),
        }
    );
}
