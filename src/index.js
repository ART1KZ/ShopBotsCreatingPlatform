import { bot as mainBot } from "./bot/main-bot/bot.js";
import { startAllActiveBots } from "./bot/shared/utils/shopBotsManager.js";

mainBot.start();
startAllActiveBots();


