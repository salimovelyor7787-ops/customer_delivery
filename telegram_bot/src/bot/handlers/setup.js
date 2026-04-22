import { listRestaurantsByOwnerId } from "../../services/restaurants.service.js";
import { upsertGroupRestaurant } from "../../services/groups.service.js";
import {
  isGroupChat,
  isUserGroupAdmin,
  restaurantSelectionKeyboard,
  sendAndTryPinMenuMessage,
} from "../helpers.js";
import { getTelegramUserLink } from "../../services/telegram-users.service.js";

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

    const telegramLink = await getTelegramUserLink(ctx.from.id);
    if (!telegramLink?.owner_id) {
      await ctx.reply("Avval botni private chatda ulang: /start <code> (kodni web paneldan oling).");
      return;
    }

    const restaurants = await listRestaurantsByOwnerId(telegramLink.owner_id);
    if (restaurants.length === 0) {
      await ctx.reply("Sizga tegishli restoran topilmadi.");
      return;
    }

    if (restaurants.length === 1) {
      const restaurant = restaurants[0];
      await upsertGroupRestaurant({
        chatId: String(ctx.chat.id),
        restaurantId: restaurant.id,
        linkedByOwnerId: telegramLink.owner_id,
      });
      await sendAndTryPinMenuMessage(ctx, restaurant.id);
      return;
    }

    await ctx.reply("Restoraningizni tanlang:", restaurantSelectionKeyboard(restaurants));
  } catch (error) {
    console.error("[/setup] error", {
      chatId: ctx.chat?.id,
      fromId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply("Setup vaqtida xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}
