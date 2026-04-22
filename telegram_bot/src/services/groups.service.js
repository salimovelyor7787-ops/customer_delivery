import { supabase } from "../lib/supabase.js";

export async function upsertGroupRestaurant({ chatId, restaurantId, linkedByOwnerId }) {
  const { data, error } = await supabase
    .from("groups")
    .upsert(
      {
        chat_id: chatId,
        restaurant_id: restaurantId,
        linked_by_owner_id: linkedByOwnerId,
      },
      { onConflict: "chat_id" },
    )
    .select("id,chat_id,restaurant_id,linked_by_owner_id")
    .single();

  if (error) throw error;
  return data;
}

export async function getGroupByChatId(chatId) {
  const { data, error } = await supabase.from("groups").select("id,chat_id,restaurant_id,linked_by_owner_id").eq("chat_id", chatId).maybeSingle();
  if (error) throw error;
  return data;
}
