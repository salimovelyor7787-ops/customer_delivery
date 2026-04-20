// deno-lint-ignore-file no-explicit-any
import { serve } from "@std/http/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveOrderPromo } from "../_shared/order_promo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LineItem = {
  menu_item_id: string;
  quantity: number;
  selected_option_ids: string[];
};

/** Same rules as calculate_price, inlined so only `create_order` must be deployed. */
async function calculateOrderPrice(
  admin: SupabaseClient,
  restaurantId: string,
  items: LineItem[],
): Promise<
  | { ok: true; subtotal_cents: number; delivery_fee_cents: number; tax_cents: number; total_cents: number; is_open: boolean }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select("id, delivery_fee_cents, min_order_cents, is_open")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr || !restaurant) {
    return { ok: false, status: 404, body: { error: "Restaurant not found" } };
  }

  let subtotal = 0;

  for (const line of items) {
    if (!line.menu_item_id || line.quantity < 1) {
      return { ok: false, status: 400, body: { error: "Invalid line item" } };
    }

    const { data: menuItem, error: mErr } = await admin
      .from("menu_items")
      .select("id, price_cents, restaurant_id, is_available")
      .eq("id", line.menu_item_id)
      .maybeSingle();

    if (mErr || !menuItem || menuItem.restaurant_id !== restaurantId) {
      return { ok: false, status: 400, body: { error: "Invalid menu item" } };
    }
    if (!menuItem.is_available) {
      return { ok: false, status: 400, body: { error: `Item unavailable: ${line.menu_item_id}` } };
    }

    let lineUnit = menuItem.price_cents as number;

    if (line.selected_option_ids?.length) {
      const { data: opts, error: oErr } = await admin
        .from("menu_item_options")
        .select("id, price_delta_cents, menu_item_id")
        .in("id", line.selected_option_ids);

      if (oErr || !opts || opts.length !== line.selected_option_ids.length) {
        return { ok: false, status: 400, body: { error: "Invalid options" } };
      }
      for (const o of opts) {
        if (o.menu_item_id !== line.menu_item_id) {
          return { ok: false, status: 400, body: { error: "Option mismatch" } };
        }
        lineUnit += o.price_delta_cents as number;
      }
    }

    subtotal += lineUnit * line.quantity;
  }

  const delivery = restaurant.delivery_fee_cents as number;
  const minOrder = restaurant.min_order_cents as number;

  if (subtotal < minOrder) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Below minimum order",
        min_order_cents: minOrder,
        subtotal_cents: subtotal,
      },
    };
  }

  const tax = Math.round(subtotal * 0);
  const total = subtotal + delivery + tax;

  return {
    ok: true,
    subtotal_cents: subtotal,
    delivery_fee_cents: delivery,
    tax_cents: tax,
    total_cents: total,
    is_open: Boolean(restaurant.is_open),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let uid: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      uid = userData.user?.id ?? null;
    }
    const body = await req.json();
    const restaurantId = body.restaurant_id as string;
    const addressId = body.address_id as string | null;
    const paymentMethod = body.payment_method as string;
    const guestPhone = body.guest_phone as string | undefined;
    const guestLat = body.guest_lat as number | undefined;
    const guestLng = body.guest_lng as number | undefined;
    const guestDeviceId = body.guest_device_id as string | undefined;
    const promoCode = body.promo_code as string | undefined;
    const items = body.items as LineItem[];

    if (!restaurantId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Invalid payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (uid) {
      if (guestLat == null || guestLng == null) {
        return json({ error: "Location is required" }, 400);
      }
      const { data: profile } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
      if (!profile || profile.role !== "customer") {
        return json({ error: "Forbidden" }, 403);
      }
      if (addressId) {
        const { data: address } = await admin.from("addresses").select("id, user_id").eq("id", addressId).maybeSingle();
        if (!address || address.user_id !== uid) {
          return json({ error: "Invalid address" }, 400);
        }
      }
    } else {
      if (!guestPhone || guestLat == null || guestLng == null || !guestDeviceId) {
        return json({ error: "Guest checkout requires phone and location" }, 400);
      }
      const now = new Date();
      const dayStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const dayEndUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
      const { count } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("guest_device_id", guestDeviceId)
        .gte("created_at", dayStartUtc)
        .lte("created_at", dayEndUtc);
      if ((count ?? 0) >= 2) {
        return json({ error: "Guest daily limit reached (2 orders)" }, 429);
      }
    }

    const priced = await calculateOrderPrice(admin, restaurantId, items);
    if (!priced.ok) {
      return json(priced.body, priced.status);
    }

    if (!priced.is_open) {
      return json({ error: "Restaurant is closed" }, 400);
    }

    const promoRes = await resolveOrderPromo(admin, {
      promoCodeRaw: promoCode,
      restaurantId,
      userId: uid,
      subtotalCents: priced.subtotal_cents,
      deliveryFeeCents: priced.delivery_fee_cents,
      taxCents: priced.tax_cents,
    });
    if (!promoRes.ok) {
      return json(promoRes.body, promoRes.status);
    }

    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: uid,
        restaurant_id: restaurantId,
        address_id: addressId,
        status: "placed",
        payment_method: paymentMethod,
        guest_phone: uid ? null : guestPhone ?? null,
        guest_lat: guestLat ?? null,
        guest_lng: guestLng ?? null,
        guest_device_id: uid ? null : guestDeviceId ?? null,
        subtotal_cents: priced.subtotal_cents,
        delivery_fee_cents: priced.delivery_fee_cents,
        tax_cents: priced.tax_cents,
        total_cents: promoRes.totalCents,
        promo_code: promoRes.promoCodeStored,
        promocode_id: promoRes.promocodeId,
        promo_discount_cents: promoRes.promoDiscountCents,
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
