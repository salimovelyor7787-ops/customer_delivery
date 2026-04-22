import { getGroupByChatId } from "../../services/groups.service.js";
import { isGroupChat, restaurantMenuKeyboard } from "../helpers.js";

export async function handleMenuCommand(ctx) {
  try {
    if (!isGroupChat(ctx.chat)) {
      await ctx.reply("`/menu` faqat group yoki supergroup ichida ishlaydi.");
      return;
    }

    const group = await getGroupByChatId(String(ctx.chat.id));
    if (!group?.restaurant_id) {
      await ctx.reply("Bu chat hali bog'lanmagan. Avval /setup <restaurant_uuid> ishlating.");
      return;
    }

    await ctx.reply("🍔 Menyu", restaurantMenuKeyboard(group.restaurant_id));
  } catch (error) {
    console.error("[/menu] error", {
      chatId: ctx.chat?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply("Menyu yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}
