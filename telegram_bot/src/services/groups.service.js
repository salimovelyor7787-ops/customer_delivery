import { supabase } from "../lib/supabase.js";

export async function upsertGroupRestaurant({ chatId, restaurantId }) {
  const { data, error } = await supabase
    .from("groups")
    .upsert(
      {
        chat_id: chatId,
        restaurant_id: restaurantId,
      },
      { onConflict: "chat_id" },
    )
    .select("id,chat_id,restaurant_id")
    .single();

  if (error) throw error;
  return data;
}

export async function getGroupByChatId(chatId) {
  const { data, error } = await supabase.from("groups").select("id,chat_id,restaurant_id").eq("chat_id", chatId).maybeSingle();
  if (error) throw error;
  return data;
}
