import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveOrderPromo } from "@/lib/server/promo-discount";

export type CreateOrderBody = {
  restaurant_id: string;
  address_id: string | null;
  payment_method: string;
  guest_phone: string | null | undefined;
  guest_lat: number | null | undefined;
  guest_lng: number | null | undefined;
  guest_device_id: string | null | undefined;
  promo_code?: string | null;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_option_ids: string[];
  }>;
};

type LineItem = CreateOrderBody["items"][number];

type PriceOk = {
  ok: true;
  subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  is_open: boolean;
};

type PriceErr = { ok: false; status: number; body: Record<string, unknown> };

async function calculateOrderPrice(admin: SupabaseClient, restaurantId: string, items: LineItem[]): Promise<PriceOk | PriceErr> {
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

/**
 * Same behaviour as Edge Function `create_order` (mirrors supabase/functions/create_order/index.ts).
 * Used when Edge is not deployed but `SUPABASE_SERVICE_ROLE_KEY` is set on the server.
 */
export async function createOrderDirect(params: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  /** Full header value, e.g. `Bearer <jwt>` (user session or anon JWT). */
  authorizationHeader: string;
  body: CreateOrderBody;
}): Promise<{ ok: true; order_id: string } | { ok: false; status: number; body: Record<string, unknown> }> {
  const { supabaseUrl, anonKey, serviceRoleKey, authorizationHeader, body } = params;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorizationHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const uid = userData.user?.id ?? null;

  const restaurantId = body.restaurant_id;
  const addressId = body.address_id;
  const paymentMethod = body.payment_method;
  const guestPhone = body.guest_phone;
  const guestLat = body.guest_lat;
  const guestLng = body.guest_lng;
  const guestDeviceId = body.guest_device_id;
  const promoCode = body.promo_code;
  const items = body.items;

  if (!restaurantId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, body: { error: "Invalid payload" } };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (uid) {
    if (guestLat == null || guestLng == null) {
      return { ok: false, status: 400, body: { error: "Location is required" } };
    }
    const { data: profile } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!profile || profile.role !== "customer") {
      return { ok: false, status: 403, body: { error: "Forbidden" } };
    }
    if (addressId) {
      const { data: address } = await admin.from("addresses").select("id, user_id").eq("id", addressId).maybeSingle();
      if (!address || address.user_id !== uid) {
        return { ok: false, status: 400, body: { error: "Invalid address" } };
      }
    }
  } else {
    if (!guestPhone || guestLat == null || guestLng == null || !guestDeviceId) {
      return { ok: false, status: 400, body: { error: "Guest checkout requires phone and location" } };
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
      return { ok: false, status: 429, body: { error: "Guest daily limit reached (2 orders)" } };
    }
  }

  const priced = await calculateOrderPrice(admin, restaurantId, items);
  if (!priced.ok) {
    return { ok: false, status: priced.status, body: priced.body };
  }

  if (!priced.is_open) {
    return { ok: false, status: 400, body: { error: "Restaurant is closed" } };
  }

  const promoRes = await resolveOrderPromo(admin, {
    promoCodeRaw: promoCode ?? undefined,
    restaurantId,
    userId: uid,
    subtotalCents: priced.subtotal_cents,
    deliveryFeeCents: priced.delivery_fee_cents,
    taxCents: priced.tax_cents,
  });
  if (!promoRes.ok) {
    return { ok: false, status: promoRes.status, body: promoRes.body };
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
    return { ok: false, status: 500, body: { error: "Could not create order" } };
  }

  const orderId = orderRow.id as string;

  for (const line of items) {
    const { data: menuItem } = await admin.from("menu_items").select("id, price_cents").eq("id", line.menu_item_id).maybeSingle();

    if (!menuItem) continue;

    let unit = menuItem.price_cents as number;
    if (line.selected_option_ids?.length) {
      const { data: opts } = await admin.from("menu_item_options").select("price_delta_cents").in("id", line.selected_option_ids);
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

  return { ok: true, order_id: orderId };
}

export function isEdgeFunctionNotFound(status: number, text: string, parsed: unknown): boolean {
  const t = text.toLowerCase();
  if (status === 404) return true;
  if (t.includes("requested function was not found")) return true;
  if (t.includes("function not found")) return true;
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const m = typeof o.message === "string" ? o.message.toLowerCase() : "";
    if (m.includes("not found") && m.includes("function")) return true;
  }
  return false;
}
