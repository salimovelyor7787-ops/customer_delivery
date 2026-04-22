import { config } from "../config.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGroupChat(chat) {
  return chat?.type === "group" || chat?.type === "supergroup";
}

export function parseSetupCommand(text = "") {
  const [, maybeRestaurantId = ""] = text.trim().split(/\s+/);
  return maybeRestaurantId.trim();
}

export function isUuid(value) {
  return UUID_REGEX.test(value);
}

export function buildRestaurantMenuUrl(restaurantId) {
  return `${config.appBaseUrl}/home/restaurant/${restaurantId}`;
}

export function restaurantMenuKeyboard(restaurantId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📖 Ochish",
            web_app: { url: buildRestaurantMenuUrl(restaurantId) },
          },
        ],
      ],
    },
  };
}

export function restaurantSelectionKeyboard(restaurants) {
  return {
    reply_markup: {
      inline_keyboard: restaurants.map((restaurant) => [
        {
          text: restaurant.name,
          callback_data: `setup_rest:${restaurant.id}`,
        },
      ]),
    },
  };
}

export async function isUserGroupAdmin(ctx) {
  const fromId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!fromId || !chatId) return false;
  const member = await ctx.telegram.getChatMember(chatId, fromId);
  return member.status === "creator" || member.status === "administrator";
}

export async function sendAndTryPinMenuMessage(ctx, restaurantId) {
  const message = await ctx.reply("🍔 Menyu", restaurantMenuKeyboard(restaurantId));
  try {
    await ctx.telegram.pinChatMessage(ctx.chat.id, message.message_id, { disable_notification: true });
  } catch (error) {
    console.error("[pinChatMessage] failed", {
      chatId: ctx.chat?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply("Please give admin rights to pin messages");
  }
}
