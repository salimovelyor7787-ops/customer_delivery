import { getRestaurantById } from "../../services/restaurants.service.js";
import { upsertGroupRestaurant } from "../../services/groups.service.js";
import {
  isGroupChat,
  isUserGroupAdmin,
  isUuid,
  parseSetupCommand,
  sendAndTryPinMenuMessage,
} from "../helpers.js";

export async function handleSetupCommand(ctx) {
  try {
    if (!isGroupChat(ctx.chat)) {
      await ctx.reply("`/setup` faqat group yoki supergroup ichida ishlaydi.");
      return;
    }

    const isAdmin = await isUserGroupAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply("Faqat group adminlari /setup ishlata oladi.");
      return;
    }

    const restaurantId = parseSetupCommand(ctx.message?.text);
    if (!restaurantId || !isUuid(restaurantId)) {
      await ctx.reply("Format: /setup <restaurant_uuid>");
      return;
    }

    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      await ctx.reply("Restaurant topilmadi. UUID ni tekshiring.");
      return;
    }

    // Optional ownership checks can be added here if your business flow maps
    // Telegram users to restaurant owners.
    await upsertGroupRestaurant({
      chatId: String(ctx.chat.id),
      restaurantId,
    });

    await sendAndTryPinMenuMessage(ctx, restaurantId);
  } catch (error) {
    console.error("[/setup] error", {
      chatId: ctx.chat?.id,
      fromId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply("Setup vaqtida xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}
