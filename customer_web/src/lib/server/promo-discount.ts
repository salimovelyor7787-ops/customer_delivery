import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderPromoResolution =
  | {
      ok: true;
      promocodeId: string | null;
      promoCodeStored: string | null;
      promoDiscountCents: number;
      totalCents: number;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

type PromoRow = {
  id: string;
  discount: number | null;
  discount_fixed_cents: number | null;
  restaurant_id: string | null;
  audience: string;
  min_subtotal_cents: number;
  expires_at: string | null;
  active: boolean;
};

function discountFromRow(promo: PromoRow, subtotalCents: number): number {
  if (promo.discount_fixed_cents != null && promo.discount_fixed_cents > 0) {
    return Math.min(promo.discount_fixed_cents, subtotalCents);
  }
  const p = promo.discount ?? 0;
  return Math.floor((subtotalCents * p) / 100);
}

/**
 * Validates promo against cart + user and returns discount + final total (subtotal unchanged in DB).
 */
export async function resolveOrderPromo(
  admin: SupabaseClient,
  input: {
    promoCodeRaw: string | undefined;
    restaurantId: string;
    userId: string | null;
    subtotalCents: number;
    deliveryFeeCents: number;
    taxCents: number;
  },
): Promise<OrderPromoResolution> {
  const raw = typeof input.promoCodeRaw === "string" ? input.promoCodeRaw.trim() : "";
  const baseTotal = input.subtotalCents + input.deliveryFeeCents + input.taxCents;
  if (!raw) {
    return {
      ok: true,
      promocodeId: null,
      promoCodeStored: null,
      promoDiscountCents: 0,
      totalCents: baseTotal,
    };
  }

  const code = raw.toUpperCase();
  const { data: promo, error } = await admin
    .from("promocodes")
    .select("id, discount, discount_fixed_cents, restaurant_id, audience, min_subtotal_cents, expires_at, active")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !promo) {
    return { ok: false, status: 400, body: { error: "Invalid promo code" } };
  }

  const row = promo as PromoRow;
  if (row.expires_at) {
    const ex = new Date(row.expires_at).getTime();
    if (!Number.isFinite(ex) || ex <= Date.now()) {
      return { ok: false, status: 400, body: { error: "Promo code expired" } };
    }
  }

  if (row.restaurant_id != null && row.restaurant_id !== input.restaurantId) {
    return { ok: false, status: 400, body: { error: "Promo not valid for this restaurant" } };
  }

  if (row.min_subtotal_cents > input.subtotalCents) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Order subtotal below promo minimum",
        min_subtotal_cents: row.min_subtotal_cents,
        subtotal_cents: input.subtotalCents,
      },
    };
  }

  if (row.audience === "first_order") {
    if (!input.userId) {
      return { ok: false, status: 400, body: { error: "This promo requires a signed-in account" } };
    }
    const { data: firstOrderRow, error: cErr } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", input.userId)
      .limit(1)
      .maybeSingle();
    if (cErr) {
      return { ok: false, status: 500, body: { error: "Could not validate promo" } };
    }
    if (firstOrderRow?.id) {
      return { ok: false, status: 400, body: { error: "Promo only for first order" } };
    }
  }

  const promoDiscountCents = discountFromRow(row, input.subtotalCents);
  const totalCents = input.subtotalCents - promoDiscountCents + input.deliveryFeeCents + input.taxCents;

  return {
    ok: true,
    promocodeId: row.id,
    promoCodeStored: code,
    promoDiscountCents,
    totalCents: Math.max(0, totalCents),
  };
}
