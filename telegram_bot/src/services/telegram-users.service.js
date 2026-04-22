import { supabase } from "../lib/supabase.js";

export async function getTelegramUserLink(telegramUserId) {
  const { data, error } = await supabase
    .from("telegram_users")
    .select("id,telegram_user_id,owner_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertTelegramUserLink({ telegramUserId, ownerId }) {
  const { data, error } = await supabase
    .from("telegram_users")
    .upsert(
      {
        telegram_user_id: telegramUserId,
        owner_id: ownerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_user_id" },
    )
    .select("id,telegram_user_id,owner_id")
    .single();
  if (error) throw error;
  return data;
}
