import { getTelegramUserLink } from "../../services/telegram-users.service.js";
import { getRestaurantById } from "../../services/restaurants.service.js";
import { isGroupChat, isUserGroupAdmin, sendAndTryPinMenuMessage } from "../helpers.js";
import { upsertGroupRestaurant } from "../../services/groups.service.js";

export async function handleSetupSelection(ctx) {
  try {
    const callbackData = ctx.callbackQuery?.data ?? "";
    const restaurantId = callbackData.replace("setup_rest:", "").trim();

    if (!isGroupChat(ctx.chat)) {
      await ctx.answerCbQuery("Bu tugma faqat groupda ishlaydi.", { show_alert: true });
      return;
    }

    const isAdmin = await isUserGroupAdmin(ctx);
    if (!isAdmin) {
      await ctx.answerCbQuery("Faqat group admini restoranni tanlay oladi.", { show_alert: true });
      return;
    }

    const telegramLink = await getTelegramUserLink(ctx.from.id);
    if (!telegramLink?.owner_id) {
      await ctx.answerCbQuery("Avval private chatda /start <code> bilan ulanishingiz kerak.", { show_alert: true });
      return;
    }

    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant || restaurant.owner_id !== telegramLink.owner_id) {
      await ctx.answerCbQuery("Siz faqat o'zingizning restoranni ulashingiz mumkin.", { show_alert: true });
      return;
    }

    await upsertGroupRestaurant({
      chatId: String(ctx.chat.id),
      restaurantId,
      linkedByOwnerId: telegramLink.owner_id,
    });

    await ctx.answerCbQuery("Restoran gruppaga ulandi.");
    await sendAndTryPinMenuMessage(ctx, restaurantId);
  } catch (error) {
    console.error("[setup selection] error", {
      chatId: ctx.chat?.id,
      fromId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.answerCbQuery("Xatolik yuz berdi. Qayta urinib ko'ring.", { show_alert: true });
  }
}
