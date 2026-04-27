import { createClient } from "@supabase/supabase-js";

export type CreateOrderBody = {
  restaurant_id: string;
  address_id: string | null;
  payment_method: string;
  guest_phone: string | null | undefined;
  guest_lat: number | null | undefined;
  guest_lng: number | null | undefined;
  guest_device_id: string | null | undefined;
  request_id?: string | null;
  promo_code?: string | null;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_option_ids: string[];
  }>;
};

function generatePickupCode(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}

async function enqueueOrderSideEffects(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  context: { userId: string | null; promoCode: string | null | undefined; requestId: string | null },
): Promise<void> {
  const jobs = [
    {
      order_id: orderId,
      event_type: "notification",
      payload: { order_id: orderId, user_id: context.userId },
    },
    {
      order_id: orderId,
      event_type: "analytics",
      payload: { order_id: orderId, request_id: context.requestId },
    },
  ];
  if (context.promoCode && context.promoCode.trim().length > 0) {
    jobs.push({
      order_id: orderId,
      event_type: "promo_log",
      payload: { order_id: orderId, promo_code: context.promoCode.trim().toUpperCase() },
    });
  }

  const { error } = await admin.from("order_events_outbox").insert(jobs);
  if (error) {
    // Queue failure should not fail checkout; we can rehydrate side effects later.
    console.error("createOrderDirect: outbox enqueue failed", error);
  }
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

  let uid: string | null = null;
  const safeAuthorizationHeader = normalizeBearerJwt(authorizationHeader);
  if (safeAuthorizationHeader) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: safeAuthorizationHeader } },
    });
    try {
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (!userErr) {
        uid = userData.user?.id ?? null;
      }
    } catch (error) {
      console.warn("createOrderDirect: auth token rejected, continuing as guest", error);
    }
  }

  const restaurantId = body.restaurant_id;
  const addressId = body.address_id;
  const paymentMethod = body.payment_method;
  const guestPhone = body.guest_phone;
  const guestLat = body.guest_lat;
  const guestLng = body.guest_lng;
  const guestDeviceId = body.guest_device_id;
  const requestIdRaw = typeof body.request_id === "string" ? body.request_id.trim() : "";
  const requestId = requestIdRaw && requestIdRaw.length <= 120 ? requestIdRaw : null;
  const promoCode = body.promo_code;
  const items = body.items;

  if (!restaurantId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, body: { error: "Invalid payload" } };
  }
  if (!guestPhone || String(guestPhone).trim().length === 0) {
    return { ok: false, status: 400, body: { error: "Phone is required" } };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const normalizedItems = items.map((line) => ({
    menu_item_id: line.menu_item_id,
    quantity: line.quantity,
    selected_option_ids: Array.isArray(line.selected_option_ids) ? line.selected_option_ids : [],
  }));

  const { data, error } = await admin.rpc("create_order_atomic", {
    p_user_id: uid,
    p_restaurant_id: restaurantId,
    p_address_id: addressId,
    p_payment_method: paymentMethod,
    p_guest_phone: String(guestPhone).trim(),
    p_guest_lat: guestLat ?? null,
    p_guest_lng: guestLng ?? null,
    p_guest_device_id: guestDeviceId ?? null,
    p_promo_code: promoCode ?? null,
    p_client_request_id: requestId,
    p_pickup_code: generatePickupCode(),
    p_items: normalizedItems,
  });

  if (error) {
    const message = error.message || "Could not create order";
    if (message.startsWith("BAD_REQUEST: ")) {
      return { ok: false, status: 400, body: { error: message.replace("BAD_REQUEST: ", "") } };
    }
    if (message.startsWith("FORBIDDEN: ")) {
      return { ok: false, status: 403, body: { error: message.replace("FORBIDDEN: ", "") } };
    }
    if (message.startsWith("NOT_FOUND: ")) {
      return { ok: false, status: 404, body: { error: message.replace("NOT_FOUND: ", "") } };
    }
    console.error("createOrderDirect RPC error", error);
    return { ok: false, status: 500, body: { error: "Could not create order" } };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const orderId = row?.order_id as string | undefined;
  if (!orderId) {
    return { ok: false, status: 500, body: { error: "Could not create order" } };
  }

  await enqueueOrderSideEffects(admin, orderId, {
    userId: uid,
    promoCode,
    requestId,
  });

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

function normalizeBearerJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (token.split(".").length !== 3) return null;

  return `Bearer ${token}`;
}
