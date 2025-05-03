import { Context, InlineKeyboard } from "grammy";
import { supabase } from "../../../shared/utils/database/index.js";

/**
 *
 * @param {Context} ctx
 */
export async function ordersScene(ctx) {
    const message = `
        Список заказов
    `;

    ctx.session.orders.maxPage = Math.floor((await getQuantityOrders(ctx)) / 5);

    const orders = await getOrders(ctx, ctx.session.orders.currentPage);

    const inlineKeyboard = generateInlineKeyboard(orders);

    await ctx.editMessageText(message, {
        reply_markup: inlineKeyboard,
    });
}

const orderType = {
    id: 0,
    created_at: "",
    customer_tg_id: 0,
    product_data_id: 0,
    client_review: "",
    buy_price: 0,
    shop_id: 0,
    product_data: { name: "" },
};

/**
 *
 * @param {orderType[]} orders
 * @returns
 */
function generateInlineKeyboard(orders) {
    const orderLabelDataPairs = orders.map((order) => {
        return [
            `📦 ${order.product_data.name}`,
            `order_page_by_id:${order.id}`,
        ];
    });

    const orderButtonCol = orderLabelDataPairs.map(([label, data]) => [
        InlineKeyboard.text(label, data),
    ]);

    const arrowButtonLabelDataPairs = [
        ["<<", "orders_page_backward"],
        [">>", "orders_page_forward"],
    ];

    const arrowButtonRow = arrowButtonLabelDataPairs.map(([label, data]) =>
        InlineKeyboard.text(label, data),
    );

    const backButtonRow = [InlineKeyboard.text("Назад", "main_menu")];

    return new InlineKeyboard([
        ...orderButtonCol,
        arrowButtonRow,
        backButtonRow,
    ]);
}

/**
 *
 * @param {Context} ctx
 */
async function getOrders(ctx, page) {
    const userId = ctx?.callbackQuery?.from?.id;
    const from = page * 5;
    const to = (page + 1) * 5 - 1;

    const { data: orders } = await supabase
        .from("purchases")
        .select("*, product_data:product_datas(product:products(*))")
        .eq("customer_tg_id", userId)
        .range(from, to);

    if (!orders) {
        return [];
    }

    const ordersWithShopName = orders.map((order) => {
        const productName = order.product_data.product.name;

        return {
            ...order,
            product_data: {
                name: productName,
            },
        };
    });

    return ordersWithShopName;
}

/**
 * Всего заказов
 * @param {Context} ctx
 */
async function getQuantityOrders(ctx) {
    const userId = ctx?.callbackQuery?.from?.id;

    const { data: orders } = await supabase
        .from("purchases")
        .select("*, product_data:product_datas(product:products(*))")
        .eq("customer_tg_id", userId);

    return orders?.length ?? 0;
}
