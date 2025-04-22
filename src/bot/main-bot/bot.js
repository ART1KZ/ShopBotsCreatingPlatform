import { Bot, InlineKeyboard, session } from "grammy";

export const bot = new Bot(process.env.BOT_TOKEN);

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            token: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await showMenu(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (callbackData) {
        case "menu":
            await showMenu(ctx, true);
            break;
        case "create_shop":
            await handleCreateShop(ctx);
            break;
        case "get_shops":
            await handleGetShops(ctx);
            break;
    }

    await ctx.answerCallbackQuery();
});

bot.on("message", async (ctx) => {
    switch (ctx.session.step) {
        case "token_input":
            await handleTokenInput(ctx);
            break;
        default:
            break;
    }
});

bot.catch((error) => {
    console.log("Ошибка в боте", error);
});

// TODO: функция получения всех магазинов-ботов, созданных пользователем
async function handleGetShops(ctx) {}

// Отправка (или изменение) сообщения с менюшкой бота
async function showMenu(ctx, isEditMessage) {
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

// Запрос токена тг бота от пользователя
async function handleCreateShop(ctx) {
    ctx.session.step = "token_input";

    await ctx.editMessageText("🔑 Отправьте токен вашего бота", {
        reply_markup: new InlineKeyboard()
            .text("❌ Назад", "menu")
    });
}

// Обработка сообщения с токеном
async function handleTokenInput(ctx) {
    const userMessage = ctx.message.text.trim();
    const tokenRegex = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;

    if (!tokenRegex.test(userMessage)) {
        ctx.session.step = undefined;

        await ctx.reply(
            "😓 Токен имеет неверный формат.\n" +
                "👇 Он должен выглядеть так\n" +
                "<code>123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>\n" +
                "Попробуйте снова! 🔑",
            {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                    .text("🔑 Повторить ввод", "create_shop")
                    .text("❌ Назад", "menu")
            }
        );
        return;
    }

    await ctx.reply("✅ Бот успешно создан!", {
        reply_markup: new InlineKeyboard()
            .text("🏠 В главное меню", "menu")
    })

    
    // TODO: реализовать создание и запуск экземпляра бота магазина
}
