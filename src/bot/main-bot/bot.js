import { Bot, session } from "grammy";
import { menuHandler } from "./scenes/main/scene.js";
import { sendDontUnderstandErrorMessage } from "../shared/utils/error.js";
import {
    createShopHandler,
    addBotTokenInputHandler,
} from "./scenes/adding-shop/scene.js";
import {
    getShopsHandler,
    manageShopHandler,
} from "./scenes/selecting-shop/scene.js";
import { toggleBotHandler } from "./scenes/editing-shop/scene.js";
import {
    addCategoryHandler,
    addSubcategoryHandler,
    getCategoriesHandler,
    manageCategoryHandler,
    addSubcategoryInputHandler,
    addCategoryInputHandler,
    editCategoryHandler,
    editCategoryInputHandler,
    deleteCategoryHandler,
    addProductHandler,
    addProductInputHandler,
    manageProductHandler,
    editProductHandler,
    editProductInputHandler,
    deleteProductHandler,
} from "./scenes/editing-shop/managing-categories/scene.js";

export const bot = new Bot(process.env.BOT_TOKEN);

// Текущие боты магазины
export const activeShopBotsHandlers = new Map();

bot.use(
    session({
        initial: () => ({
            step: undefined, // Текущий этап пользователя в боте
            currentBotToken: undefined, // Последний введенный токен бота пользователем
        }),
    })
);

bot.command("start", async (ctx) => await menuHandler(ctx));

bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    switch (true) {
        case callbackData === "menu":
            await menuHandler(ctx, true);
            break;

        case callbackData === "create_shop":
            await createShopHandler(ctx);
            break;
        case callbackData === "get_shops":
            await getShopsHandler(ctx);
            break;
        case callbackData.startsWith("manage_shop"):
            await manageShopHandler(ctx);
            break;

        case callbackData.startsWith("toggle_bot"):
            await toggleBotHandler(ctx);
            break;
        case callbackData.startsWith("get_categories"):
            await getCategoriesHandler(ctx);
            break;
        case callbackData.startsWith("add_category"):
            await addCategoryHandler(ctx);
            break;
        case callbackData.startsWith("manage_category"):
            await manageCategoryHandler(ctx);
            break;
        case callbackData.startsWith("add_subcategory"):
            await addSubcategoryHandler(ctx);
            break;
        case callbackData.startsWith("edit_category"):
            await editCategoryHandler(ctx);
            break;
        case callbackData.startsWith("delete_category"):
            await deleteCategoryHandler(ctx);
            break;
        case callbackData.startsWith("add_product"):
            await addProductHandler(ctx);
            break;
        case callbackData.startsWith("manage_product"):
            await manageProductHandler(ctx);
            break;
        case callbackData.startsWith("edit_product"):
            await editProductHandler(ctx);
            break;
        case callbackData.startsWith("delete_product"):
            await deleteProductHandler(ctx);
            break;
    }

    await ctx.answerCallbackQuery();
});

bot.on("message", async (ctx) => {
    switch (true) {
        case ctx.session.step === "add_bot_token_input":
            await addBotTokenInputHandler(ctx);
            break;
        case ctx.session.step.startsWith("add_category_input"):
            await addCategoryInputHandler(ctx);
            break;
        case ctx.session.step.startsWith("add_subcategory_input"):
            await addSubcategoryInputHandler(ctx);
            break;
        case ctx.session.step.startsWith("edit_category_input"):
            await editCategoryInputHandler(ctx);
            break;
        case ctx.session.step.startsWith("add_product_input"):
            await addProductInputHandler(ctx);
            break;
        case ctx.session.step.startsWith("edit_product_input"):
            await editProductInputHandler(ctx);
            break;
        default:
            await sendDontUnderstandErrorMessage(ctx);
            break;
    }
});

bot.catch((error) => {
    console.error("Ошибка в боте", error);
});
