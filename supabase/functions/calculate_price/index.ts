// deno-lint-ignore-file no-explicit-any
// Standalone pricing endpoint (Flutter / tools). `create_order` inlines the same logic so checkout works if only that function is deployed.
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
    const body = await req.json();
    const restaurantId = body.restaurant_id as string;
    const items = body.items as Array<{
      menu_item_id: string;
      quantity: number;
      selected_option_ids: string[];
    }>;

    if (!restaurantId || !Array.isArray(items)) {
      return json({ error: "Invalid payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: restaurant, error: rErr } = await admin
      .from("restaurants")
      .select("id, delivery_fee_cents, min_order_cents, is_open")
      .eq("id", restaurantId)
      .maybeSingle();

    if (rErr || !restaurant) {
      return json({ error: "Restaurant not found" }, 404);
    }

    let subtotal = 0;

    for (const line of items) {
      if (!line.menu_item_id || line.quantity < 1) {
        return json({ error: "Invalid line item" }, 400);
      }

      const { data: menuItem, error: mErr } = await admin
        .from("menu_items")
        .select("id, price_cents, restaurant_id, is_available")
        .eq("id", line.menu_item_id)
        .maybeSingle();

      if (mErr || !menuItem || menuItem.restaurant_id !== restaurantId) {
        return json({ error: "Invalid menu item" }, 400);
      }
      if (!menuItem.is_available) {
        return json({ error: `Item unavailable: ${line.menu_item_id}` }, 400);
      }

      let lineUnit = menuItem.price_cents as number;

      if (line.selected_option_ids?.length) {
        const { data: opts, error: oErr } = await admin
          .from("menu_item_options")
          .select("id, price_delta_cents, menu_item_id")
          .in("id", line.selected_option_ids);

        if (oErr || !opts || opts.length !== line.selected_option_ids.length) {
          return json({ error: "Invalid options" }, 400);
        }
        for (const o of opts) {
          if (o.menu_item_id !== line.menu_item_id) {
            return json({ error: "Option mismatch" }, 400);
          }
          lineUnit += o.price_delta_cents as number;
        }
      }

      subtotal += lineUnit * line.quantity;
    }

    const delivery = restaurant.delivery_fee_cents as number;
    const minOrder = restaurant.min_order_cents as number;

    if (subtotal < minOrder) {
      return json({
        error: "Below minimum order",
        min_order_cents: minOrder,
        subtotal_cents: subtotal,
      }, 400);
    }

    const tax = Math.round(subtotal * 0); // plug regional tax rules
    const total = subtotal + delivery + tax;

    return json({
      subtotal_cents: subtotal,
      delivery_fee_cents: delivery,
      tax_cents: tax,
      total_cents: total,
      currency: "USD",
    });
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
