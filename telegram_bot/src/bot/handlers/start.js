import { consumeLinkCode } from "../../services/link-codes.service.js";
import { upsertTelegramUserLink } from "../../services/telegram-users.service.js";

function parseStartCode(text = "") {
  const [, maybeCode = ""] = text.trim().split(/\s+/);
  return maybeCode.trim();
}

export async function handleStartCommand(ctx) {
  try {
    if (ctx.chat?.type !== "private") {
      await ctx.reply("Ulash kodi private chatda yuboriladi. Botga private yozing.");
      return;
    }

    const code = parseStartCode(ctx.message?.text);
    if (!code) {
      await ctx.reply("Salom! Guruh ulash uchun web paneldan kod oling va shu yerga yuboring:\n/start <code>");
      return;
    }

    const consumed = await consumeLinkCode({
      code,
      telegramUserId: ctx.from.id,
    });

    if (consumed.status === "not_found") {
      await ctx.reply("Kod topilmadi.");
      return;
    }
    if (consumed.status === "used" || consumed.status === "already_consumed") {
      await ctx.reply("Bu kod allaqachon ishlatilgan.");
      return;
    }
    if (consumed.status === "expired") {
      await ctx.reply("Kod muddati tugagan. Web paneldan yangisini oling.");
      return;
    }

    await upsertTelegramUserLink({
      telegramUserId: ctx.from.id,
      ownerId: consumed.ownerId,
    });

    await ctx.reply("Telegram akkauntingiz ulandi. Endi guruhda /setup buyrug'i bilan restoran tanlang.");
  } catch (error) {
    console.error("[/start] error", {
      fromId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply("Ulash jarayonida xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}
