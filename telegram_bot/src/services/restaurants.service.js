import { supabase } from "../lib/supabase.js";

export async function getRestaurantById(restaurantId) {
  const { data, error } = await supabase.from("restaurants").select("id,name,owner_id").eq("id", restaurantId).maybeSingle();
  if (error) throw error;
  return data;
}
