import { createBot } from "./bot/index.js";

const bot = createBot();

async function start() {
  await bot.telegram.setMyCommands([
    { command: "setup", description: "Groupni restoran UUID bilan bog'lash" },
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
