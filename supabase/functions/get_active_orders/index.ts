// deno-lint-ignore-file no-explicit-any
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "on_the_way",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = normalizeBearerJwt(req.headers.get("Authorization"));
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    let userData: { user: { id: string } | null } = { user: null };
    let userErr: { message: string } | null = null;
    try {
      const result = await supabase.auth.getUser();
      userData = { user: result.data.user ? { id: result.data.user.id } : null };
      userErr = result.error ? { message: result.error.message } : null;
    } catch (error) {
      console.warn("get_active_orders: auth token rejected", error);
      userErr = { message: "Invalid or unsupported auth token" };
    }
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const uid = userData.user.id;

    const { data: rows, error } = await supabase
      .from("orders")
      .select("id, status, total_cents, delivery_fee_cents, created_at, restaurants(name)")
      .eq("user_id", uid)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return json({ error: error.message }, 500);
    }

    const orders = (rows ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      total_cents: r.total_cents,
      delivery_fee_cents: r.delivery_fee_cents,
      created_at: r.created_at,
      restaurants: r.restaurants,
    }));

    return json({ orders });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeBearerJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (token.split(".").length !== 3) return null;

  return `Bearer ${token}`;
}
