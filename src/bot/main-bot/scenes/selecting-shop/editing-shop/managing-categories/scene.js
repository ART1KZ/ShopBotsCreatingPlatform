import { supabase } from "../../../../../shared/utils/database/index.js";
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
        .eq("shop_id", shopId)
        .is("parent_id", null); // Только категории верхнего уровня
    if (error) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось загрузить список категорий.",
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

    if (categories.length > 0) {
        for (const category of categories) {
            const index = categories.indexOf(category);
            keyboard.text(
                `${category.name}`,
                `manage_category_${category.id}_${shopId}`
            );
            if (index === categories.length - 1 || (index + 1) % 2 === 0) {
                keyboard.row();
            }
        }
    }

    keyboard
        .text("➕ Добавить категорию", `add_category_${shopId}`)
        .text("🧠 Сгенерировать категорию", `generate_category_${shopId}`)
        .row()
        .text("❌ Назад", `manage_shop_${shopId}`);
    await ctx.editMessageText(
        "<b>📍 Текущая позиция:</b> Категории\nВыберите категорию для управления:",
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
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

    await ctx.editMessageText(
        "<b>📍 Текущая позиция:</b> Добавление категории\nВведите название новой категории:",
        {
            parse_mode: "HTML",
            reply_markup: addCategoryKeyboard,
        }
    );
}

/**
 * Обрабатывает сообщение с названием новой категории, добавляет его в базу данных
 * @param {Context} ctx
 */
export async function addCategoryInputHandler(ctx) {
    const shopId = ctx.session.step.split("_")[3];
    const newCategoryName = ctx.message.text;

    const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategoryName, shop_id: shopId }])
        .select();

    if (error) {
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНе удалось добавить категорию <b>"${newCategoryName}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text(
                    "🔙 Вернуться к списку категорий",
                    `get_categories_${shopId}`
                ),
            }
        );
        return;
    }

    await ctx.reply(
        `<b>✅ Успех!</b>\nКатегория <b>"${newCategoryName}"</b> успешно добавлена.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text(
                "🔙 Вернуться к списку категорий",
                `get_categories_${shopId}`
            ),
        }
    );
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

    let { data: category, error: catError } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (catError || !category) {
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text(
                "🏠 В главное меню",
                "menu"
            ),
        });
        return;
    }

    // Проверяем, является ли это подкатегорией (parent_id не null)
    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const entityName = category.name;
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    let messageText = `<b>📍 Текущая позиция:</b> ${entityType} "${entityName}"\n`;
    if (isSubcategory && parentCategoryName) {
        messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
    }
    messageText += "Выберите действие для управления:";

    if (!isSubcategory) {
        // Для категорий верхнего уровня показываем подкатегории
        let { data: subcategories, error: subcatError } = await supabase
            .from("categories")
            .select("*")
            .eq("parent_id", categoryId);

        if (subcatError) {
            await ctx.editMessageText(
                "<b>❌ Ошибка!</b>\nНе удалось загрузить подкатегории.",
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

        if (subcategories.length > 0) {
            for (const subcategory of subcategories) {
                const index = subcategories.indexOf(subcategory);
                keyboard.text(
                    `${subcategory.name}`,
                    `manage_category_${subcategory.id}_${shopId}`
                );
                if (
                    index === subcategories.length - 1 ||
                    (index + 1) % 2 === 0
                ) {
                    keyboard.row();
                }
            }
            keyboard
                .text(
                    "➕ Добавить подкатегорию",
                    `add_subcategory_${categoryId}_${shopId}`
                )
                .text(
                    "🧠 Сгенерировать подкатегорию",
                    `generate_subcategory_${shopId}_${categoryId}`
                )
                .row()
                .text(
                    "✏️ Изменить категорию",
                    `edit_category_${categoryId}_${shopId}`
                )
                .text(
                    "🗑️ Удалить категорию",
                    `delete_category_${categoryId}_${shopId}`
                )
                .row()
                .text("❌ Назад", `get_categories_${shopId}`);
            messageText = `<b>📍 Текущая позиция:</b> Категория "${entityName}"\nВыберите подкатегорию для управления:`;
            return await ctx.editMessageText(messageText, {
                parse_mode: "HTML",
                reply_markup: keyboard,
            });
        }
    }

    // Для подкатегорий или категорий без подкатегорий показываем товары
    let { data: products, error: prodError } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId);

    if (prodError) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось загрузить товары.",
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

    if (products.length > 0) {
        for (const product of products) {
            const index = products.indexOf(product);
            keyboard.text(
                `${product.name}`,
                `manage_product_${product.id}_${shopId}`
            );
            if (index === products.length - 1 || (index + 1) % 2 === 0) {
                keyboard.row();
            }
        }

        keyboard
            .text("➕ Добавить товар", `add_product_${categoryId}_${shopId}`)
            .row()
            .text(
                "✏️ Изменить категорию",
                `edit_category_${categoryId}_${shopId}`
            )
            .text(
                "🗑️ Удалить категорию",
                `delete_category_${categoryId}_${shopId}`
            )
            .row()
            .text(
                "❌ Назад",
                isSubcategory
                    ? `manage_category_${category.parent_id}_${shopId}`
                    : `get_categories_${shopId}`
            );
        messageText = `<b>📍 Текущая позиция:</b> ${entityType} "${entityName}"\n`;
        if (isSubcategory && parentCategoryName) {
            messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
        }
        messageText += "Выберите товар для управления:";
        return await ctx.editMessageText(messageText, {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
    }

    if (!isSubcategory) {
        keyboard
            .text(
                "➕ Добавить подкатегорию",
                `add_subcategory_${categoryId}_${shopId}`
            )
            .text(
                "🧠 Сгенерировать подкатегорию",
                `generate_subcategory_${shopId}_${categoryId}`
            )
            .row();
    }
    // Если нет подкатегорий и товаров
    keyboard
        .text("➕ Добавить товар", `add_product_${categoryId}_${shopId}`)
        .row()
        .text("✏️ Изменить категорию", `edit_category_${categoryId}_${shopId}`)
        .text("🗑️ Удалить категорию", `delete_category_${categoryId}_${shopId}`)
        .row();

    keyboard.text(
        "❌ Назад",
        isSubcategory
            ? `manage_category_${category.parent_id}_${shopId}`
            : `get_categories_${shopId}`
    );

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
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
    const shopId = callbackDataParts[3];

    let { data: category, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        addCategoryKeyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: addCategoryKeyboard,
        });
        return;
    }

    addCategoryKeyboard.text(
        "❌ Отмена",
        `manage_category_${categoryId}_${shopId}`
    );
    ctx.session.step = `add_subcategory_input_${categoryId}_${shopId}`;

    await ctx.editMessageText(
        `<b>📍 Текущая позиция:</b> Добавление подкатегории\n<b>📚 Категория:</b> ${category.name}\nВведите название новой подкатегории:`,
        {
            parse_mode: "HTML",
            reply_markup: addCategoryKeyboard,
        }
    );
}

/**
 * Обрабатывает сообщение с названием новой подкатегории, добавляет его в базу данных
 * @param {Context} ctx
 */
export async function addSubcategoryInputHandler(ctx) {
    const newSubcategoryName = ctx.message.text;
    const callbackDataParts = ctx.session.step.split("_");
    const categoryId = callbackDataParts[3];
    const shopId = callbackDataParts[4];
    const successfullKeyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("id, shop_id, name")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        successfullKeyboard.text("🏠 В главное меню", "menu");
        await ctx.reply("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: successfullKeyboard,
        });
        return;
    }

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
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНе удалось добавить подкатегорию <b>"${newSubcategoryName}"</b> в категорию <b>"${category.name}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: successfullKeyboard.text(
                    "🔙 Вернуться к категории",
                    `manage_category_${categoryId}_${shopId}`
                ),
            }
        );
        return;
    }

    ctx.session.step = undefined;
    successfullKeyboard.text(
        "🔙 Вернуться к категории",
        `manage_category_${categoryId}_${shopId}`
    );
    await ctx.reply(
        `<b>✅ Успех!</b>\nПодкатегория <b>"${newSubcategoryName}"</b> успешно добавлена в категорию <b>"${category.name}"</b>.`,
        {
            parse_mode: "HTML",
            reply_markup: successfullKeyboard,
        }
    );
}

/**
 * Отправляет пользователю сообщение с ожиданием нового названия категории
 * @param {Context} ctx
 */
export async function editCategoryHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const categoryId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    keyboard.text("❌ Отмена", `manage_category_${categoryId}_${shopId}`);
    ctx.session.step = `edit_category_input_${categoryId}_${shopId}`;

    let messageText = `<b>📍 Текущая позиция:</b> ${entityType} "${category.name}"\n`;
    if (isSubcategory && parentCategoryName) {
        messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
    }
    messageText += `<b>✏️ Текущее название:</b> ${category.name}\nВведите новое название:`;

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Обрабатывает сообщение с новым названием категории, обновляет его в базе данных
 * @param {Context} ctx
 */
export async function editCategoryInputHandler(ctx) {
    const callbackDataParts = ctx.session.step.split("_");
    const categoryId = callbackDataParts[3];
    const shopId = callbackDataParts[4];
    const newCategoryName = ctx.message.text;
    const keyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.reply("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    const { error: updateError } = await supabase
        .from("categories")
        .update({ name: newCategoryName })
        .eq("id", categoryId);

    if (updateError) {
        keyboard.text(
            "🔙 Вернуться к категории",
            `manage_category_${categoryId}_${shopId}`
        );
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНе удалось обновить ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    ctx.session.step = undefined;
    keyboard.text(
        "🔙 Вернуться к категории",
        `manage_category_${categoryId}_${shopId}`
    );
    let messageText = `<b>✅ Успех!</b>\n${entityType} <b>"${newCategoryName}"</b> успешно обновлена`;
    if (isSubcategory && parentCategoryName) {
        messageText += ` в категории <b>"${parentCategoryName}"</b>`;
    }
    messageText += ".";

    await ctx.reply(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Удаляет категорию из базы данных с каскадным удалением связанных записей
 * @param {Context} ctx
 */
export async function deleteCategoryHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const categoryId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

    if (deleteError) {
        keyboard.text(
            "🔙 Вернуться к категории",
            `manage_category_${categoryId}_${shopId}`
        );
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось удалить ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    keyboard.text(
        "🔙 Вернуться назад",
        isSubcategory
            ? `manage_category_${category.parent_id}_${shopId}`
            : `get_categories_${shopId}`
    );
    let messageText = `<b>✅ Успех!</b>\n${entityType} <b>"${category.name}"</b> и все связанные записи успешно удалены`;
    if (isSubcategory && parentCategoryName) {
        messageText += ` из категории <b>"${parentCategoryName}"</b>`;
    }
    messageText += ".";

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Отправляет пользователю сообщение с ожиданием данных нового товара
 * @param {Context} ctx
 */
export async function addProductHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const categoryId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    keyboard.text("❌ Отмена", `manage_category_${categoryId}_${shopId}`);
    ctx.session.step = `add_product_input_${categoryId}_${shopId}`;

    let messageText = `<b>📍 Текущая позиция:</b> Добавление товара\n<b>🗂 ${entityType}:</b> ${category.name}\n`;
    if (isSubcategory && parentCategoryName) {
        messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
    }
    messageText +=
        "Введите данные нового товара в формате:\n• Название: [название]\n• Цена: [цена]";

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Обрабатывает сообщение с данными нового товара, добавляет его в базу данных
 * @param {Context} ctx
 */
export async function addProductInputHandler(ctx) {
    const callbackDataParts = ctx.session.step.split("_");
    const categoryId = callbackDataParts[3];
    const shopId = callbackDataParts[4];
    const inputText = ctx.message.text;
    const keyboard = new InlineKeyboard();

    let { data: category, error } = await supabase
        .from("categories")
        .select("*, parent:categories!parent_id(name)")
        .eq("id", categoryId)
        .single();

    if (error || !category) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.reply("<b>❌ Ошибка!</b>\nКатегория не найдена.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    // Парсинг ввода пользователя
    const nameMatch = inputText.match(/Название:\s*(.+)/i);
    const priceMatch = inputText.match(/Цена:\s*(\d+\.?\d*)/i);

    if (!nameMatch || !priceMatch) {
        keyboard.text("❌ Отмена", `manage_category_${categoryId}_${shopId}`);
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНеверный формат ввода для ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>. Пожалуйста, используйте формат:\n• Название: [название]\n• Цена: [цена]`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    const productName = nameMatch[1].trim();
    const productPrice = parseFloat(priceMatch[1]);

    if (isNaN(productPrice) || productPrice <= 0) {
        keyboard.text("❌ Отмена", `manage_category_${categoryId}_${shopId}`);
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nЦена должна быть числом больше 0 для ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    const { data: product, error: insertError } = await supabase
        .from("products")
        .insert([
            {
                name: productName,
                category_id: categoryId,
                price: productPrice,
            },
        ])
        .select("*")
        .single()

    if (insertError) {
        keyboard.text(
            "🔙 Вернуться к категории",
            `manage_category_${categoryId}_${shopId}`
        );
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНе удалось добавить товар <b>"${productName}"</b> в ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    const { data } = await supabase.from("product_datas").insert([
        { data: "1", product_id: product.id },
        { data: "2", product_id: product.id },
        { data: "3", product_id: product.id },
        { data: "4", product_id: product.id },
        { data: "5", product_id: product.id },
    ]);

    ctx.session.step = undefined;
    keyboard.text(
        "🔙 Вернуться к категории",
        `manage_category_${categoryId}_${shopId}`
    );
    let messageText = `<b>✅ Успех!</b>\nТовар <b>"${productName}"</b> успешно добавлен в ${entityType.toLowerCase()} <b>"${
        category.name
    }"</b>`;
    if (isSubcategory && parentCategoryName) {
        messageText += ` (Категория <b>"${parentCategoryName}"</b>)`;
    }
    messageText += ".";

    await ctx.reply(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Обрабатывает выбор товара, отправляет пользователю меню взаимодействия с товаром
 * @param {Context} ctx
 */
export async function manageProductHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const productId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: product, error } = await supabase
        .from("products")
        .select(
            `
            *,
            categories (
                id,
                name,
                parent_id,
                parent:categories!parent_id(name)
            )
        `
        )
        .eq("id", productId)
        .single();

    if (error || !product) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nТовар не найден.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const category = product.categories;
    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    keyboard
        .text("✏️ Изменить товар", `edit_product_${productId}_${shopId}`)
        .text("🗑️ Удалить товар", `delete_product_${productId}_${shopId}`)
        .row()
        .text("❌ Назад", `manage_category_${category.id}_${shopId}`);

    let messageText = `<b>📍 Текущая позиция:</b> Товар "${product.name}"\n<b>🗂 ${entityType}:</b> ${category.name}\n`;
    if (isSubcategory && parentCategoryName) {
        messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
    }
    messageText += `<b>💵 Цена:</b> ${product.price}\nВыберите действие для управления:`;

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Отправляет пользователю сообщение с ожиданием новых данных товара
 * @param {Context} ctx
 */
export async function editProductHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const productId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: product, error } = await supabase
        .from("products")
        .select(
            `
            *,
            categories (
                id,
                name,
                parent_id,
                parent:categories!parent_id(name)
            )
        `
        )
        .eq("id", productId)
        .single();

    if (error || !product) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nТовар не найден.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const category = product.categories;
    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    keyboard.text("❌ Отмена", `manage_product_${productId}_${shopId}`);
    ctx.session.step = `edit_product_input_${productId}_${shopId}`;

    let messageText = `<b>📍 Текущая позиция:</b> Товар "${product.name}"\n<b>🗂 ${entityType}:</b> ${category.name}\n`;
    if (isSubcategory && parentCategoryName) {
        messageText += `<b>📚 Категория:</b> ${parentCategoryName}\n`;
    }
    messageText += `<b>✏️ Текущее название:</b> ${product.name}\n<b>💵 Текущая цена:</b> ${product.price}\nВведите новые данные в формате:\n• Название: [название]\n• Цена: [цена]`;

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Обрабатывает сообщение с новыми данными товара, обновляет его в базе данных
 * @param {Context} ctx
 */
export async function editProductInputHandler(ctx) {
    const callbackDataParts = ctx.session.step.split("_");
    const productId = callbackDataParts[3];
    const shopId = callbackDataParts[4];
    const inputText = ctx.message.text;
    const keyboard = new InlineKeyboard();

    let { data: product, error } = await supabase
        .from("products")
        .select(
            `
            *,
            categories (
                id,
                name,
                parent_id,
                parent:categories!parent_id(name)
            )
        `
        )
        .eq("id", productId)
        .single();

    if (error || !product) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.reply("<b>❌ Ошибка!</b>\nТовар не найден.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const category = product.categories;
    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    // Парсинг ввода пользователя
    const nameMatch = inputText.match(/Название:\s*(.+)/i);
    const priceMatch = inputText.match(/Цена:\s*(\d+\.?\d*)/i);

    if (!nameMatch || !priceMatch) {
        keyboard.text("❌ Отмена", `manage_product_${productId}_${shopId}`);
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНеверный формат ввода для товара <b>"${
                product.name
            }"</b> в ${entityType.toLowerCase()} <b>"${
                category.name
            }"</b>. Пожалуйста, используйте формат:\n• Название: [название]\n• Цена: [цена]`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    const productName = nameMatch[1].trim();
    const productPrice = parseFloat(priceMatch[1]);

    if (isNaN(productPrice) || productPrice <= 0) {
        keyboard.text("❌ Отмена", `manage_product_${productId}_${shopId}`);
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nЦена должна быть числом больше 0 для товара <b>"${
                product.name
            }"</b> в ${entityType.toLowerCase()} <b>"${category.name}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    const { error: updateError } = await supabase
        .from("products")
        .update({
            name: productName,
            price: productPrice,
        })
        .eq("id", productId);

    if (updateError) {
        keyboard.text(
            "🔙 Вернуться к товару",
            `manage_product_${productId}_${shopId}`
        );
        await ctx.reply(
            `<b>❌ Ошибка!</b>\nНе удалось обновить товар <b>"${
                product.name
            }"</b> в ${entityType.toLowerCase()} <b>"${category.name}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    ctx.session.step = undefined;
    keyboard.text(
        "🔙 Вернуться к товару",
        `manage_product_${productId}_${shopId}`
    );
    let messageText = `<b>✅ Успех!</b>\nТовар <b>"${productName}"</b> успешно обновлен в ${entityType.toLowerCase()} <b>"${
        category.name
    }"</b>`;
    if (isSubcategory && parentCategoryName) {
        messageText += ` (Категория <b>"${parentCategoryName}"</b>)`;
    }
    messageText += ".";

    await ctx.reply(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Удаляет товар из базы данных с каскадным удалением связанных записей
 * @param {Context} ctx
 */
export async function deleteProductHandler(ctx) {
    const callbackDataParts = ctx.callbackQuery.data.split("_");
    const productId = callbackDataParts[2];
    const shopId = callbackDataParts[3];
    const keyboard = new InlineKeyboard();

    let { data: product, error } = await supabase
        .from("products")
        .select(
            `
            *,
            categories (
                id,
                name,
                parent_id,
                parent:categories!parent_id(name)
            )
        `
        )
        .eq("id", productId)
        .single();

    if (error || !product) {
        keyboard.text("🏠 В главное меню", "menu");
        await ctx.editMessageText("<b>❌ Ошибка!</b>\nТовар не найден.", {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
        return;
    }

    const category = product.categories;
    const isSubcategory = category.parent_id !== null;
    const entityType = isSubcategory ? "Подкатегория" : "Категория";
    const parentCategoryName =
        isSubcategory && category.parent?.name ? category.parent.name : "";

    const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

    if (deleteError) {
        keyboard.text(
            "🔙 Вернуться к товару",
            `manage_product_${productId}_${shopId}`
        );
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось удалить товар <b>"${
                product.name
            }"</b> в ${entityType.toLowerCase()} <b>"${category.name}"</b>.`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard,
            }
        );
        return;
    }

    keyboard.text(
        "🔙 Вернуться к категории",
        `manage_category_${category.id}_${shopId}`
    );
    let messageText = `<b>✅ Успех!</b>\nТовар <b>"${
        product.name
    }"</b> и все связанные записи успешно удалены из ${entityType.toLowerCase()} <b>"${
        category.name
    }"</b>`;
    if (isSubcategory && parentCategoryName) {
        messageText += ` (Категория <b>"${parentCategoryName}"</b>)`;
    }
    messageText += ".";

    await ctx.editMessageText(messageText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}
