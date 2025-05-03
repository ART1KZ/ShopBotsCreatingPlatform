import { supabase } from "../../../../shared/utils/database/index.js";
import { Context, InlineKeyboard } from "grammy";
import { decryptData } from "../../../../shared/utils/encryption.js";
import { Bot } from "grammy";

/**
 * Показывает меню управления администраторами магазина
 * @param {Context} ctx
 */
export async function manageAdminsHandler(ctx) {
    const shopId = ctx.callbackQuery.data.split("_")[2];

    const { data: shop, error: shopError } = await supabase
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

    const botToken = decryptData(shop.bot_token_hash);
    const shopName = (await new Bot(botToken).api.getMe()).first_name;

    const { data: admins, error: adminsError } = await supabase
        .from("administrators")
        .select("id, tg_user_id, can_manage_roles, can_chat_clients, can_manage_products, users(full_name)")
        .eq("shop_id", shopId);

    if (adminsError) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nНе удалось загрузить список администраторов.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🏠 В главное меню", "menu"),
            }
        );
        return;
    }

    let adminsText = `<b>👨‍💼 Администраторы магазина "${shopName}":</b>\n\n`;
    if (admins.length === 0) {
        adminsText += "Администраторы отсутствуют.\n";
    } else {
        admins.forEach((admin) => {
            adminsText += `<b>${admin.users.full_name} (ID: ${admin.tg_user_id})</b>\n`;
            adminsText += `Права:\n`;
            adminsText += `- Управление ролями: ${admin.can_manage_roles ? "✅" : "❌"}\n`;
            adminsText += `- Чат с клиентами: ${admin.can_chat_clients ? "✅" : "❌"}\n`;
            adminsText += `- Управление товарами: ${admin.can_manage_products ? "✅" : "❌"}\n\n`;
        });
    }

    const keyboard = new InlineKeyboard()
        .text("➕ Добавить администратора", `add_admin_${shopId}`)
        .row();

    admins.forEach((admin) => {
        keyboard
            .text(`✏️ Изменить ${admin.users.full_name}`, `edit_admin_${shopId}_${admin.id}`)
            .text(`🗑️ Удалить`, `delete_admin_${shopId}_${admin.id}`)
            .row();
    });

    keyboard.text("🔙 Назад", `manage_shop_${shopId}`);

    await ctx.editMessageText(adminsText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

/**
 * Запрашивает Telegram ID нового администратора
 * @param {Context} ctx
 */
export async function addAdminHandler(ctx) {
    const shopId = ctx.callbackQuery.data.split("_")[2];

    ctx.session.step = `add_admin_input_${shopId}`;
    await ctx.editMessageText(
        "Введите Telegram ID пользователя, которого хотите назначить администратором:",
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("❌ Отменить", `manage_admins_${shopId}`),
        }
    );
}

/**
 * Обрабатывает ввод Telegram ID и права нового администратора
 * @param {Context} ctx
 */
export async function addAdminInputHandler(ctx) {
    const shopId = ctx.session.step.split("_")[2];
    const tgUserId = parseInt(ctx.message.text);

    if (isNaN(tgUserId)) {
        await ctx.reply("Пожалуйста, введите числовой Telegram ID.", {
            reply_markup: new InlineKeyboard().text("❌ Отменить", `manage_admins_${shopId}`),
        });
        return;
    }

    // Проверяем, существует ли пользователь
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("telegram_id")
        .eq("telegram_id", tgUserId)
        .single();

    if (userError || !user) {
        await ctx.reply("Пользователь с таким Telegram ID не найден.", {
            reply_markup: new InlineKeyboard().text("❌ Отменить", `manage_admins_${shopId}`),
        });
        return;
    }

    // Проверяем, не является ли пользователь уже администратором
    const { data: existingAdmin, error: adminError } = await supabase
        .from("administrators")
        .select("id")
        .eq("shop_id", shopId)
        .eq("tg_user_id", tgUserId)
        .single();

    if (adminError && adminError.code !== "PGRST116") { // PGRST116 - нет записей
        await ctx.reply("Ошибка при проверке администратора.", {
            reply_markup: new InlineKeyboard().text("❌ Отменить", `manage_admins_${shopId}`),
        });
        return;
    }

    if (existingAdmin) {
        await ctx.reply("Этот пользователь уже является администратором магазина.", {
            reply_markup: new InlineKeyboard().text("❌ Отменить", `manage_admins_${shopId}`),
        });
        return;
    }

    // Запрашиваем права
    const keyboard = new InlineKeyboard()
        .text("✅ Управление ролями", `add_admin_rights_${shopId}_${tgUserId}_roles_true`)
        .text("❌ Управление ролями", `add_admin_rights_${shopId}_${tgUserId}_roles_false`)
        .row()
        .text("✅ Чат с клиентами", `add_admin_rights_${shopId}_${tgUserId}_chat_true`)
        .text("❌ Чат с клиентами", `add_admin_rights_${shopId}_${tgUserId}_chat_false`)
        .row()
        .text("✅ Управление товарами", `add_admin_rights_${shopId}_${tgUserId}_products_true`)
        .text("❌ Управление товарами", `add_admin_rights_${shopId}_${tgUserId}_products_false`)
        .row()
        .text("💾 Подтвердить", `confirm_add_admin_${shopId}_${tgUserId}`)
        .text("❌ Отменить", `manage_admins_${shopId}`);

    ctx.session.adminRights = {
        can_manage_roles: false,
        can_chat_clients: false,
        can_manage_products: false,
    };

    await ctx.reply(
        "Выберите права для нового администратора:",
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Обрабатывает выбор прав нового администратора
 * @param {Context} ctx
 */
export async function addAdminRightsHandler(ctx) {
    const [_, __, shopId, tgUserId, right, value] = ctx.callbackQuery.data.split("_");
    const boolValue = value === "true";

    ctx.session.adminRights[`can_${right}`] = boolValue;

    const keyboard = new InlineKeyboard()
        .text(
            ctx.session.adminRights.can_manage_roles ? "✅ Управление ролями" : "❌ Управление ролями",
            `add_admin_rights_${shopId}_${tgUserId}_roles_${!ctx.session.adminRights.can_manage_roles}`
        )
        .text(
            ctx.session.adminRights.can_chat_clients ? "✅ Чат с клиентами" : "❌ Чат с клиентами",
            `add_admin_rights_${shopId}_${tgUserId}_chat_${!ctx.session.adminRights.can_chat_clients}`
        )
        .row()
        .text(
            ctx.session.adminRights.can_manage_products ? "✅ Управление товарами" : "❌ Управление товарами",
            `add_admin_rights_${shopId}_${tgUserId}_products_${!ctx.session.adminRights.can_manage_products}`
        )
        .text("💾 Подтвердить", `confirm_add_admin_${shopId}_${tgUserId}`)
        .row()
        .text("❌ Отменить", `manage_admins_${shopId}`);

    await ctx.editMessageText(
        "Выберите права для нового администратора:",
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Подтверждает добавление нового администратора
 * @param {Context} ctx
 */
export async function confirmAddAdminHandler(ctx) {
    const [_, __, shopId, tgUserId] = ctx.callbackQuery.data.split("_");

    const { error } = await supabase
        .from("administrators")
        .insert([
            {
                shop_id: shopId,
                tg_user_id: tgUserId,
                can_manage_roles: ctx.session.adminRights.can_manage_roles,
                can_chat_clients: ctx.session.adminRights.can_chat_clients,
                can_manage_products: ctx.session.adminRights.can_manage_products,
            },
        ]);

    ctx.session.step = undefined;
    ctx.session.adminRights = undefined;

    if (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось добавить администратора: ${error.message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    await ctx.editMessageText(
        `<b>✅ Успех!</b>\nАдминистратор успешно добавлен.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
        }
    );
}

/**
 * Показывает меню изменения прав администратора
 * @param {Context} ctx
 */
export async function editAdminHandler(ctx) {
    const [_, __, shopId, adminId] = ctx.callbackQuery.data.split("_");

    const { data: admin, error } = await supabase
        .from("administrators")
        .select("tg_user_id, can_manage_roles, can_chat_clients, can_manage_products, users(full_name)")
        .eq("id", adminId)
        .eq("shop_id", shopId)
        .single();

    if (error || !admin) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nАдминистратор не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    const keyboard = new InlineKeyboard()
        .text(
            admin.can_manage_roles ? "✅ Управление ролями" : "❌ Управление ролями",
            `update_admin_rights_${shopId}_${adminId}_roles_${!admin.can_manage_roles}`
        )
        .text(
            admin.can_chat_clients ? "✅ Чат с клиентами" : "❌ Чат с клиентами",
            `update_admin_rights_${shopId}_${adminId}_chat_${!admin.can_chat_clients}`
        )
        .row()
        .text(
            admin.can_manage_products ? "✅ Управление товарами" : "❌ Управление товарами",
            `update_admin_rights_${shopId}_${adminId}_products_${!admin.can_manage_products}`
        )
        .text("💾 Подтвердить", `confirm_update_admin_${shopId}_${adminId}`)
        .row()
        .text("❌ Отменить", `manage_admins_${shopId}`);

    await ctx.editMessageText(
        `<b>✏️ Изменение прав для ${admin.users.full_name} (ID: ${admin.tg_user_id})</b>\nВыберите новые права:`,
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Обновляет права администратора
 * @param {Context} ctx
 */
export async function updateAdminRightsHandler(ctx) {
    const [_, __, shopId, adminId, right, value] = ctx.callbackQuery.data.split("_");
    const boolValue = value === "true";

    const { data: admin, error } = await supabase
        .from("administrators")
        .select("can_manage_roles, can_chat_clients, can_manage_products")
        .eq("id", adminId)
        .eq("shop_id", shopId)
        .single();

    if (error || !admin) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nАдминистратор не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    admin[`can_${right}`] = boolValue;

    const keyboard = new InlineKeyboard()
        .text(
            admin.can_manage_roles ? "✅ Управление ролями" : "❌ Управление ролями",
            `update_admin_rights_${shopId}_${adminId}_roles_${!admin.can_manage_roles}`
        )
        .text(
            admin.can_chat_clients ? "✅ Чат с клиентами" : "❌ Чат с клиентами",
            `update_admin_rights_${shopId}_${adminId}_chat_${!admin.can_chat_clients}`
        )
        .row()
        .text(
            admin.can_manage_products ? "✅ Управление товарами" : "❌ Управление товарами",
            `update_admin_rights_${shopId}_${adminId}_products_${!admin.can_manage_products}`
        )
        .text("💾 Подтвердить", `confirm_update_admin_${shopId}_${adminId}`)
        .row()
        .text("❌ Отменить", `manage_admins_${shopId}`);

    await ctx.editMessageText(
        "Выберите новые права для администратора:",
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Подтверждает обновление прав администратора
 * @param {Context} ctx
 */
export async function confirmUpdateAdminHandler(ctx) {
    const [_, __, shopId, adminId] = ctx.callbackQuery.data.split("_");

    const { data: admin, error } = await supabase
        .from("administrators")
        .select("can_manage_roles, can_chat_clients, can_manage_products")
        .eq("id", adminId)
        .eq("shop_id", shopId)
        .single();

    if (error || !admin) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nАдминистратор не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    const { error: updateError } = await supabase
        .from("administrators")
        .update({
            can_manage_roles: admin.can_manage_roles,
            can_chat_clients: admin.can_chat_clients,
            can_manage_products: admin.can_manage_products,
        })
        .eq("id", adminId)
        .eq("shop_id", shopId);

    if (updateError) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось обновить права администратора: ${updateError.message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    await ctx.editMessageText(
        `<b>✅ Успех!</b>\nПрава администратора успешно обновлены.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
        }
    );
}

/**
 * Запрашивает подтверждение удаления администратора
 * @param {Context} ctx
 */
export async function deleteAdminHandler(ctx) {
    const [_, __, shopId, adminId] = ctx.callbackQuery.data.split("_");

    const { data: admin, error } = await supabase
        .from("administrators")
        .select("tg_user_id, users(full_name)")
        .eq("id", adminId)
        .eq("shop_id", shopId)
        .single();

    if (error || !admin) {
        await ctx.editMessageText(
            "<b>❌ Ошибка!</b>\nАдминистратор не найден.",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    const keyboard = new InlineKeyboard()
        .text("✅ Подтвердить удаление", `confirm_delete_admin_${shopId}_${adminId}`)
        .text("❌ Отменить", `manage_admins_${shopId}`);

    await ctx.editMessageText(
        `<b>🗑️ Удаление администратора</b>\nВы уверены, что хотите удалить администратора <b>${admin.users.full_name}</b> (ID: ${admin.tg_user_id})?`,
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );
}

/**
 * Подтверждает удаление администратора
 * @param {Context} ctx
 */
export async function confirmDeleteAdminHandler(ctx) {
    const [_, __, shopId, adminId] = ctx.callbackQuery.data.split("_");

    const { error } = await supabase
        .from("administrators")
        .delete()
        .eq("id", adminId)
        .eq("shop_id", shopId);

    if (error) {
        await ctx.editMessageText(
            `<b>❌ Ошибка!</b>\nНе удалось удалить администратора: ${error.message}`,
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
            }
        );
        return;
    }

    await ctx.editMessageText(
        `<b>✅ Успех!</b>\nАдминистратор успешно удалён.`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("🔙 Назад", `manage_admins_${shopId}`),
        }
    );
}