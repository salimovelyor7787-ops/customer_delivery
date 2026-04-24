// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
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

type PricedLine = {
  menu_item_id: string;
  quantity: number;
  selected_option_ids: string[];
  unit_price_cents: number;
};

/** Same rules as calculate_price, inlined so only `create_order` must be deployed. */
async function calculateOrderPrice(
  admin: SupabaseClient,
  restaurantId: string,
  items: LineItem[],
): Promise<
  | {
      ok: true;
      subtotal_cents: number;
      delivery_fee_cents: number;
      tax_cents: number;
      total_cents: number;
      is_open: boolean;
      priced_lines: PricedLine[];
    }
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

  const normalizedLines = items.map((line) => ({
    menu_item_id: line.menu_item_id,
    quantity: line.quantity,
    selected_option_ids: Array.isArray(line.selected_option_ids) ? line.selected_option_ids : [],
  }));
  for (const line of normalizedLines) {
    if (!line.menu_item_id || line.quantity < 1) {
      return { ok: false, status: 400, body: { error: "Invalid line item" } };
    }
  }

  const uniqueMenuItemIds = [...new Set(normalizedLines.map((line) => line.menu_item_id))];
  const { data: menuItems, error: menuErr } = await admin
    .from("menu_items")
    .select("id, price_cents, restaurant_id, is_available")
    .in("id", uniqueMenuItemIds);
  if (menuErr || !menuItems || menuItems.length !== uniqueMenuItemIds.length) {
    return { ok: false, status: 400, body: { error: "Invalid menu item" } };
  }
  const menuById = new Map(menuItems.map((item) => [item.id as string, item]));
  for (const itemId of uniqueMenuItemIds) {
    const menuItem = menuById.get(itemId);
    if (!menuItem || menuItem.restaurant_id !== restaurantId) {
      return { ok: false, status: 400, body: { error: "Invalid menu item" } };
    }
    if (!menuItem.is_available) {
      return { ok: false, status: 400, body: { error: `Item unavailable: ${itemId}` } };
    }
  }

  const uniqueOptionIds = [...new Set(normalizedLines.flatMap((line) => line.selected_option_ids))];
  let optionById = new Map<string, { menu_item_id: string; price_delta_cents: number }>();
  if (uniqueOptionIds.length) {
    const { data: options, error: optionsErr } = await admin
      .from("menu_item_options")
      .select("id, menu_item_id, price_delta_cents")
      .in("id", uniqueOptionIds);
    if (optionsErr || !options || options.length !== uniqueOptionIds.length) {
      return { ok: false, status: 400, body: { error: "Invalid options" } };
    }
    optionById = new Map(
      options.map((option) => [
        option.id as string,
        { menu_item_id: option.menu_item_id as string, price_delta_cents: option.price_delta_cents as number },
      ]),
    );
  }

  let subtotal = 0;
  const pricedLines: PricedLine[] = [];
  for (const line of normalizedLines) {
    const menuItem = menuById.get(line.menu_item_id);
    if (!menuItem) {
      return { ok: false, status: 400, body: { error: "Invalid menu item" } };
    }

    let lineUnit = menuItem.price_cents as number;
    for (const optionId of line.selected_option_ids) {
      const option = optionById.get(optionId);
      if (!option || option.menu_item_id !== line.menu_item_id) {
        return { ok: false, status: 400, body: { error: "Option mismatch" } };
      }
      lineUnit += option.price_delta_cents;
    }

    subtotal += lineUnit * line.quantity;
    pricedLines.push({
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      selected_option_ids: line.selected_option_ids,
      unit_price_cents: lineUnit,
    });
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
    priced_lines: pricedLines,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = normalizeBearerJwt(req.headers.get("Authorization"));
    let uid: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      try {
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr) {
          console.warn("create_order: could not resolve auth user", userErr.message);
        } else {
          uid = userData.user?.id ?? null;
        }
      } catch (error) {
        console.warn("create_order: auth token rejected, continuing as guest", error);
      }
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
    const requestIdRaw = typeof body.request_id === "string" ? body.request_id.trim() : "";
    const requestId = requestIdRaw && requestIdRaw.length <= 120 ? requestIdRaw : null;
    const items = body.items as LineItem[];

    if (!restaurantId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Invalid payload" }, 400);
    }
    if (!guestPhone || String(guestPhone).trim().length === 0) {
      return json({ error: "Phone is required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let customerPhone: string | null = String(guestPhone).trim();

    if (uid) {
      if (guestLat == null || guestLng == null) {
        return json({ error: "Location is required" }, 400);
      }
      const { data: profile } = await admin.from("profiles").select("role,phone").eq("id", uid).maybeSingle();
      if (!profile || profile.role !== "customer") {
        return json({ error: "Forbidden" }, 403);
      }
      if (!customerPhone) {
        customerPhone = (profile.phone as string | null) ?? null;
      }
      if (addressId) {
        const { data: address } = await admin.from("addresses").select("id, user_id").eq("id", addressId).maybeSingle();
        if (!address || address.user_id !== uid) {
          return json({ error: "Invalid address" }, 400);
        }
      }
    } else {
      if (guestLat == null || guestLng == null || !guestDeviceId) {
        return json({ error: "Guest checkout requires phone and location" }, 400);
      }
      customerPhone = String(guestPhone).trim();
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

    if (requestId) {
      const lookup = admin.from("orders").select("id").eq("client_request_id", requestId);
      const { data: existingOrder } = uid
        ? await lookup.eq("user_id", uid).maybeSingle()
        : await lookup.eq("guest_device_id", guestDeviceId ?? "__missing__").maybeSingle();
      if (existingOrder?.id) {
        return json({ order_id: existingOrder.id as string });
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
        guest_phone: String(guestPhone).trim(),
        customer_phone: customerPhone,
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
        client_request_id: requestId,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      if (requestId && orderErr?.code === "23505") {
        const lookup = admin.from("orders").select("id").eq("client_request_id", requestId);
        const { data: existingOrder } = uid
          ? await lookup.eq("user_id", uid).maybeSingle()
          : await lookup.eq("guest_device_id", guestDeviceId ?? "__missing__").maybeSingle();
        if (existingOrder?.id) {
          return json({ order_id: existingOrder.id as string });
        }
      }
      console.error(orderErr);
      return json({ error: "Could not create order" }, 500);
    }

    const orderId = orderRow.id as string;
    const orderItemsPayload = priced.priced_lines.map((line) => ({
      order_id: orderId,
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
      selected_option_ids: line.selected_option_ids,
    }));
    const { error: orderItemsErr } = await admin.from("order_items").insert(orderItemsPayload);
    if (orderItemsErr) {
      console.error("create_order: order_items insert failed", orderItemsErr);
      await admin.from("orders").delete().eq("id", orderId);
      return json({ error: "Could not create order items" }, 500);
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

function normalizeBearerJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  // Ignore non-JWT bearer values (e.g. publishable keys), they are not user sessions.
  if (token.split(".").length !== 3) return null;

  return `Bearer ${token}`;
}
