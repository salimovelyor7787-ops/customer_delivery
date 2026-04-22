import { Telegraf } from "telegraf";
import { config } from "../config.js";
import { handleSetupCommand } from "./handlers/setup.js";
import { handleMenuCommand } from "./handlers/menu.js";
import { handleStartCommand } from "./handlers/start.js";
import { handleSetupSelection } from "./handlers/setup-select.js";

export function createBot() {
  const bot = new Telegraf(config.botToken);

  // Debug visibility for Railway logs: confirms whether updates reach the bot process.
  bot.use(async (ctx, next) => {
    console.log("[update]", {
      updateType: ctx.updateType,
      chatId: ctx.chat?.id ?? null,
      chatType: ctx.chat?.type ?? null,
      fromId: ctx.from?.id ?? null,
      text: ctx.message && "text" in ctx.message ? ctx.message.text : null,
    });
    await next();
  });

  bot.start(handleStartCommand);

  bot.command("setup", handleSetupCommand);
  bot.command("menu", handleMenuCommand);
  bot.action(/^setup_rest:/, handleSetupSelection);

  bot.catch((error, ctx) => {
    console.error("[bot.catch] unhandled error", {
      updateType: ctx.updateType,
      chatId: ctx.chat?.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return bot;
}
