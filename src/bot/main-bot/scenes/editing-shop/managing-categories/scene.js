import { supabase } from "../../../../shared/utils/database/index.js";
import { Context, InlineKeyboard } from "grammy";

/**
 * Отправляет пользователю список категорий для взаимодействия
 * @param {Context} ctx
 */
export async function getCategoriesHandler(ctx) {
    ctx.session.step = undefined;
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[2];
    const keyboard = new InlineKeyboard();

    let { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("shop_id", shopId);

    if (categories.length > 0) {
        for (const category of categories) {
            const index = categories.indexOf(category);
            keyboard.text(
                `${category.name}`,
                `manage_category_${category.id}_${shopId}`
            );
            if (index === categories.length - 1 || (index + 1) % 2 == 0) {
                keyboard.row();
            }
        }
    }

    keyboard.text("➕ Добавить категорию", `add_category_${shopId}`);
    keyboard.text("❌ Назад", `manage_shop_${shopId}`);
    await ctx.editMessageText("📂 Выберите категорию:", {
        reply_markup: keyboard,
    });
}

/**
 * Отправляет пользователю сообщение с ожиданием названия новой категории от пользователя
 * @param {Context} ctx
 */
export async function addCategoryHandler(ctx) {
    const addCategoryKeyboard = new InlineKeyboard();
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const shopId = callbackDataParts[2];

    addCategoryKeyboard.text("❌ Отмена", `get_categories_${shopId}`);
    ctx.session.step = `add_category_input_${shopId}`;

    await ctx.editMessageText(`📂 Введите название новой категории`, {
        reply_markup: addCategoryKeyboard,
    });
}

/**
 * Обрабатывает сообщение с названием новой категории, добавляет его в базу данных
 * @param {Context} ctx
 */
export async function addCategoryInputHandler(ctx) {
    const shopId = ctx.session.step.split("_")[3];
    const newCategoryName = ctx.message.text;

    await supabase
        .from("categories")
        .insert([{ name: newCategoryName, shop_id: shopId }])
        .select();

    await ctx.reply("✅ Категория успешно добавлена", {
        reply_markup: new InlineKeyboard().text(
            "🔙 Вернуться к списку категорий",
            `get_categories_${shopId}`
        ),
    });
}

/**
 * Обрабатывает выбор категории (нажатие на кнопку с названием категории),
 * отправляет пользователю сообщение с меню взаимодействия с категорией
 * @param {Context} ctx
 */
export async function manageCategoryHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const categoryId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: subcategories } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", categoryId);

    if (subcategories.length > 0) {
        for (const subcategory of subcategories) {
            const index = subcategories.indexOf(subcategory);
            keyboard.text(
                `${subcategory.name}`,
                `manage_subcategory_${subcategory.id}`
            );
            if (index === subcategories.length - 1 || (index + 1) % 2 == 0) {
                keyboard.row();
            }
        }
        keyboard
            .text("➕ Добавить подкатегорию", `add_subcategory_${categoryId}`)
            .row()
            .text("✏️ Изменить категорию", `edit_category_${categoryId}`)
            .text("🗑️ Удалить категорию", `delete_category_${categoryId}`)
            .row()
            .text("❌ Назад", `get_categories_${shopId}`);
        return await ctx.editMessageText("📂 Выберите подкатегорию:", {
            reply_markup: keyboard,
        });
    }
    let { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId);

    if (products.length > 0) {
        for (const product of products) {
            const index = products.indexOf(subcategories);
            keyboard.text(`${product.name}`, `manage_product_${product.id}`);
            if (index === products.length - 1 || (index + 1) % 2 == 0) {
                keyboard.row();
            }
        }

        keyboard
            .text("➕ Добавить товар", `add_product_${categoryId}`)
            .row()
            .text("✏️ Изменить категорию", `edit_category_${categoryId}`)
            .text("🗑️ Удалить категорию", `delete_category_${categoryId}`)
            .row()
            .text("❌ Назад", `get_categories_${shopId}`);
        return await ctx.editMessageText("🛍️ Выберите товар:", {
            reply_markup: keyboard,
        });
    }

    keyboard
        .text("➕ Добавить подкатегорию", `add_subcategory_${categoryId}`)
        .text("➕ Добавить товар", `add_product_${categoryId}`)
        .row()
        .text("🗑️ Удалить категорию", `delete_category_${categoryId}`)
        .text("✏️ Изменить категорию", `edit_category_${categoryId}`)
        .row()
        .text("❌ Назад", `get_categories_${shopId}`);
    await ctx.editMessageText("🎯 Выберите действие:", {
        reply_markup: keyboard,
    });
}

/**
 * Отправляет пользователю сообщение с ожиданием названия новой подкатегории от пользователя
 * @param {Context} ctx
 */
export async function addSubcategoryHandler(ctx) {
    const addCategoryKeyboard = new InlineKeyboard();
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const categoryId = callbackDataParts[2];

    let { data: category, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        addCategoryKeyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("Категория не найдена.", {
            reply_markup: addCategoryKeyboard,
        });
        return;
    }

    addCategoryKeyboard.text(
        "❌ Отмена",
        `manage_category_${categoryId}_${category.shop_id}`
    );
    ctx.session.step = `add_subcategory_input_${categoryId}`;

    await ctx.editMessageText(`📂 Введите название новой подкатегории`, {
        reply_markup: addCategoryKeyboard,
    });
}

/**
 * Обрабатывает сообщение с названием новой подкатегории, добавляет его в базу данных
 * @param {Context} ctx
 */
export async function addSubcategoryInputHandler(ctx) {
    const newSubcategoryName = ctx.message.text;
    const categoryId = ctx.session.step.split("_")[3];
    const successfullKeyboard = new InlineKeyboard();

    // Fetch the parent category to get its shop_id
    let { data: category, error } = await supabase
        .from("categories")
        .select("id, shop_id")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        successfullKeyboard.text("🏠 В главное меню", "menu");
        await ctx.reply("Категория не найдена.", {
            reply_markup: successfullKeyboard,
        });
        return;
    }

    // Insert the new subcategory with shop_id
    const { error: insertError } = await supabase
        .from("categories")
        .insert([
            {
                name: newSubcategoryName,
                parent_id: categoryId,
                shop_id: category.shop_id,
            },
        ])
        .select();

    if (insertError) {
        console.error("Error inserting subcategory:", insertError);
        await ctx.reply("Ошибка при добавлении подкатегории.");
        return;
    }

    ctx.session.step = undefined;
    successfullKeyboard.text(
        "🔙 Вернуться к списку категорий",
        `manage_category_${categoryId}_${category.shop_id}`
    );
    await ctx.reply("✅ Подкатегория успешно добавлена", {
        reply_markup: successfullKeyboard,
    });
}
