import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", async (ctx) => await showMenu(ctx, true));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (callbackData) {
        case "menu":
            await showMenu(ctx, false);
            break;
        case "create_shop":
            await handleCreateShop(ctx);
            break;
        case "get_shops":
            break;
    }
});
async function showMenu(ctx, isNewMessage) {
    const keyboard = new InlineKeyboard();
    keyboard
        .text("🏬 Создать магазин", "create_shop")
        .row()
        .text("🛍️ Мои магазины", "get_shops");

    const message =
        "👋 Добро пожаловать!\n" +
        "🚀 Создавайте и управляйте своими магазинами в Telegram легко и быстро!\n" +
        "Выберите действие ниже 👇";

    
    if(isNewMessage) {
        await ctx.reply(message,
            {
                reply_markup: keyboard,
            }
        );
    } else {
        await ctx.editMessageText(message,
            {
                reply_markup: keyboard,
            }
        );
    }
}

async function handleCreateShop(ctx) {
    const backButton = new InlineKeyboard();
    backButton.text("❌ Назад", "menu");

    await ctx.editMessageText("🔑 Отправьте токен вашего бота", {
        reply_markup: backButton,
    });
}

bot.start();
