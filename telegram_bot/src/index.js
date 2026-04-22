import { createBot } from "./bot/index.js";

const bot = createBot();

async function start() {
  // Polling and webhook cannot work together; ensure stale webhook is cleared.
  await bot.telegram.deleteWebhook({ drop_pending_updates: true });

  const me = await bot.telegram.getMe();
  console.log(`Bot connected as @${me.username}`);

  await bot.telegram.setMyCommands([
    { command: "start", description: "Telegram akkauntni bir martalik kod bilan ulash" },
    { command: "setup", description: "Group uchun o'zingizga tegishli restoran tanlash" },
    { command: "menu", description: "Restoran menyusini ochish tugmasi" },
  ]);

  await bot.launch();
  console.log("Telegram bot started");
}

start().catch((error) => {
  console.error("Failed to start Telegram bot", error);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
