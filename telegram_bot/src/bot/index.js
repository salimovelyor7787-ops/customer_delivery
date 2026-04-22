import { Telegraf } from "telegraf";
import { config } from "../config.js";
import { handleSetupCommand } from "./handlers/setup.js";
import { handleMenuCommand } from "./handlers/menu.js";

export function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.command("setup", handleSetupCommand);
  bot.command("menu", handleMenuCommand);

  bot.catch((error, ctx) => {
    console.error("[bot.catch] unhandled error", {
      updateType: ctx.updateType,
      chatId: ctx.chat?.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return bot;
}
