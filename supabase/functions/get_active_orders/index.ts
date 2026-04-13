// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
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
