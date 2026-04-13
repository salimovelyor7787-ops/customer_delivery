// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const uid = userData.user.id;
    const body = await req.json();
    const restaurantId = body.restaurant_id as string;
    const addressId = body.address_id as string;
    const paymentMethod = body.payment_method as string;
    const items = body.items as Array<{
      menu_item_id: string;
      quantity: number;
      selected_option_ids: string[];
    }>;

    if (!restaurantId || !addressId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Invalid payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: profile } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!profile || profile.role !== "customer") {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: address } = await admin.from("addresses").select("id, user_id").eq("id", addressId).maybeSingle();
    if (!address || address.user_id !== uid) {
      return json({ error: "Invalid address" }, 400);
    }

    const priceRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/calculate_price`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: JSON.stringify({ restaurant_id: restaurantId, items }),
      },
    );

    if (!priceRes.ok) {
      const err = await priceRes.json().catch(() => ({}));
      return json({ error: err.error ?? "Price validation failed" }, 400);
    }

    const price = await priceRes.json();

    const { data: restaurant } = await admin
      .from("restaurants")
      .select("is_open")
      .eq("id", restaurantId)
      .maybeSingle();

    if (!restaurant?.is_open) {
      return json({ error: "Restaurant is closed" }, 400);
    }

    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: uid,
        restaurant_id: restaurantId,
        address_id: addressId,
        status: "placed",
        payment_method: paymentMethod,
        subtotal_cents: price.subtotal_cents,
        delivery_fee_cents: price.delivery_fee_cents,
        tax_cents: price.tax_cents,
        total_cents: price.total_cents,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      console.error(orderErr);
      return json({ error: "Could not create order" }, 500);
    }

    const orderId = orderRow.id as string;

    for (const line of items) {
      const { data: menuItem } = await admin
        .from("menu_items")
        .select("id, price_cents")
        .eq("id", line.menu_item_id)
        .maybeSingle();

      if (!menuItem) continue;

      let unit = menuItem.price_cents as number;
      if (line.selected_option_ids?.length) {
        const { data: opts } = await admin
          .from("menu_item_options")
          .select("price_delta_cents")
          .in("id", line.selected_option_ids);
        for (const o of opts ?? []) {
          unit += o.price_delta_cents as number;
        }
      }

      await admin.from("order_items").insert({
        order_id: orderId,
        menu_item_id: line.menu_item_id,
        quantity: line.quantity,
        unit_price_cents: unit,
        selected_option_ids: line.selected_option_ids ?? [],
      });
    }

    return json({ order_id: orderId });
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
