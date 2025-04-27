import { bot as mainBot } from "./bot/main-bot/bot.js";
import { startAllActiveBots, startShopBot } from "./bot/shared/utils/shopBotsManager.js";

mainBot.start();
startAllActiveBots();
// startShopBot("7702384595:AAEky5pv98YYFZ0PWB9oijHQI73wEq2nJXg");
