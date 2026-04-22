import { supabase } from "../lib/supabase.js";

export async function consumeLinkCode({ code, telegramUserId }) {
  const nowIso = new Date().toISOString();
  const { data: row, error: fetchError } = await supabase
    .from("telegram_link_codes")
    .select("id,owner_id,expires_at,used_at")
    .eq("code", code)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) return { status: "not_found" };
  if (row.used_at) return { status: "used" };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { status: "expired" };

  const { data: updated, error: updateError } = await supabase
    .from("telegram_link_codes")
    .update({
      used_at: nowIso,
      used_by_telegram_user_id: telegramUserId,
    })
    .eq("id", row.id)
    .is("used_at", null)
    .select("owner_id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return { status: "already_consumed" };

  return { status: "ok", ownerId: updated.owner_id };
}
