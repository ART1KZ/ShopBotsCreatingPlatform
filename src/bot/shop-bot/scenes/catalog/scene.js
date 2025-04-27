import { supabase } from "../../../shared/utils/database/index.js"
import fetch from "node-fetch";

/**
 * Получение категорий товаров магазина
 * @param {Context} ctx 
 */
export async function getCategories(ctx) {
    try {
        const shop = await supabase
        .from("shops")
        .select("*")
        .eq("bot_token_hash", ctx.session.currentBotTokenHash)
        

        const categories = await supabase
        .from("categories")
        .select("*")
        .eq("shop_id", shop.data[0].id)
        .is("parent_id", null);

        await ctx.editMessageText("Категории товаров", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "🔍 Поиск",
                            callback_data: "search",
                        }
                    ],
                    categories.data.map((category) => ({
                    text: '🔹' + category.name,
                    callback_data: `get_category ${category.id}`,
                })),
                [
                    {
                        text: "❌ Назад",
                        callback_data: "main_menu",
                    }
                ]
                ]
            },
        })
    }
    catch (error) {
        console.error(error);
    }
}

/**
 * Получение товаров категории/дочерних категорий
 * @param {Context} ctx
 */
export async function getCategory(ctx) {
    try {
        const shop = await supabase
        .from("shops")
        .select("*")
        .eq("bot_token_hash", ctx.session.currentBotTokenHash)

        const category_id = Number(ctx.callbackQuery.data.split(" ")[1]);

        const parent_categories = await supabase
        .from("categories")
        .select("*")
        .eq("shop_id", shop.data[0].id)
        .eq("parent_id", category_id);


        if (parent_categories.data.length > 0) {
            await ctx.editMessageText("Выберите категорию", {
                reply_markup: {
                    inline_keyboard: [parent_categories.data.map((category) => ({
                            text: '🔹' + category.name,
                            callback_data: `get_category ${category.id}`,
                        }),
                    ),
                    [
                        {
                            text: "❌ Назад",
                            callback_data: "get_categories",
                        }
                    ]]
                }
            });
        } else {
            const products = await supabase
            .from("products")
            .select("*")
            .eq("category_id", category_id);
        
            await ctx.editMessageText("Товары", {
                reply_markup: {
                    inline_keyboard: [products.data.map((product) => ({
                        text: '🔹' + product.name,
                        callback_data: `get_product ${product.id}`,
                    })),
                    [
                        {
                            text: "❌ Назад",
                            callback_data: "get_categories",
                        }
                    ]]
                }
            });
        }
    }
    catch(error) {
        console.error(error);
    }
}

/**
 * Получение товаров в категории
 * @param {Context} ctx
 */
export async function getProduct(ctx) {
    try {
        const product_id = Number(ctx.callbackQuery.data.split(" ")[1]);
        const product = await supabase
        .from("products")
        .select("*")
        .eq("id", product_id);

        await ctx.editMessageText(`${product.data[0].name} - ${product.data[0].price}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "🛒 Купить",
                        callback_data: `buy ${product_id}`,
                    }],
                    [{
                        text: "❌ Назад",
                        callback_data: `get_category ${product.data[0].category_id}`,
                    }]
                ]
            }
        });
    }
    catch(error) {
        console.error(error);
    }
}

/**
 * Поиск по товарам с помощью ИИ
 * @param {Context} ctx
 */
export async function search(ctx) {
    try {
        if (ctx.session.step !== "search_input") {
            ctx.session.step = "search_input";
        
            return await ctx.editMessageText("🔍 Введите название товара, который хотите приобрести", {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "❌ Назад",
                            callback_data: "get_categories",
                        }]
                    ]
                }
            })
        }

        const shop = await supabase
        .from("shops")
        .select("*")
        .eq("bot_token_hash", ctx.session.currentBotTokenHash)

        const categories = await supabase
        .from("categories")
        .select("*")
        .eq("shop_id", shop.data[0].id)

        const items = []

        for (const category of categories.data) {
            const products = await supabase
            .from("products")
            .select("*")
            .eq("category_id", category.id)

            for (const product of products.data) {
                items.push(product);
            }
        }

        const response = await fetch("https://api.mistral.ai/v1/agents/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: JSON.stringify(items) + "\n\nprompt: " + ctx.message.text,
                    }
                ],
                agent_id: process.env.MISTRAL_AGENT_ID,
            })
        })

        if (response.status !== 200) return console.error(response);
        const data = await response.json();

        const answer = JSON.parse(data.choices[0].message.content.replace('\`\`\`json\n', '').replace('\`\`\`', ''));;

        if (answer.error_message) return await ctx.reply(answer.error_message, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "❌ Назад",
                        callback_data: "get_categories",
                    }]
                ]
            }
        });

        const product = await supabase
        .from("products")
        .select("*")
        .eq("id", answer.product_id);

        await ctx.reply(`${product.data[0].name} - ${product.data[0].price}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "🛒 Купить",
                        callback_data: `buy ${product.data[0].id}`,
                    }],
                    [{
                        text: "❌ Назад",
                        callback_data: "get_categories",
                    }]
                ]
            }
        });

        ctx.session.step = null;
    }
    catch(error) {
        console.error(error);
    }
}
