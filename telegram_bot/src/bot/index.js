import { Telegraf } from "telegraf";
import { config } from "../config.js";
import { handleSetupCommand } from "./handlers/setup.js";
import { handleMenuCommand } from "./handlers/menu.js";

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

  bot.start(async (ctx) => {
    await ctx.reply("Bot ishlayapti. Group ichida /setup <restaurant_uuid> va /menu buyruqlarini ishlating.");
  });

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
