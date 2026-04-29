"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type TrackedOrder = {
  id: string;
  status: string;
  created_at: string;
  restaurants: { name: string } | { name: string }[] | null;
};

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "rejected"]);

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function statusLabel(status: string) {
  const value = normalizeStatus(status);
  if (value === "placed") return "Qabul qilindi";
  if (value === "confirmed") return "Tasdiqlandi";
  if (value === "preparing") return "Tayyorlanmoqda";
  if (value === "ready_for_pickup") return "Olib ketishga tayyor";
  if (value === "picked_up") return "Kuryer oldi";
  if (value === "on_the_way") return "Yo'lda";
  if (value === "delivered") return "Yetkazildi";
  if (value === "cancelled") return "Bekor qilindi";
  if (value === "rejected") return "Rad etildi";
  return status || "Noma'lum";
}

export default function CartPage() {
  const { items, setQuantity, totalCents, removeItem, promoCode, setPromoCode } = useCart();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackingReady, setTrackingReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOrderStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setTrackedOrder(null);
        setTrackingReady(true);
        return;
      }

      const savedOrderId = window.localStorage.getItem("customer_last_order_id");

      const selectFields = "id,status,created_at,restaurants(name)";
      if (savedOrderId) {
        const { data } = await supabase
          .from("orders")
          .select(selectFields)
          .eq("id", savedOrderId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (active && data) {
          setTrackedOrder(data as unknown as TrackedOrder);
          setTrackingReady(true);
          return;
        }
      }

      const { data } = await supabase
        .from("orders")
        .select(selectFields)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      setTrackedOrder((data as unknown as TrackedOrder) ?? null);
      setTrackingReady(true);
    };

    void loadOrderStatus();
    const timer = window.setInterval(() => {
      void loadOrderStatus();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [supabase]);

  const restaurantName = useMemo(() => {
    if (!trackedOrder?.restaurants) return "Restoran";
    if (Array.isArray(trackedOrder.restaurants)) return trackedOrder.restaurants[0]?.name ?? "Restoran";
    return trackedOrder.restaurants.name;
  }, [trackedOrder]);

  const isTerminal = trackedOrder ? TERMINAL_STATUSES.has(normalizeStatus(trackedOrder.status)) : false;

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Savat</h1>
      {trackingReady && trackedOrder ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">So&apos;nggi buyurtma</p>
          <p className="font-medium">{restaurantName}</p>
          <p className="mt-1 text-sm text-zinc-700">
            Holat: <span className={isTerminal ? "font-medium text-zinc-600" : "font-semibold text-emerald-700"}>{statusLabel(trackedOrder.status)}</span>
          </p>
          <p className="text-xs text-zinc-500">{new Date(trackedOrder.created_at).toLocaleString()}</p>
          <Link href={`/orders/${trackedOrder.id}`} className="mt-3 inline-flex rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">
            Buyurtmani ochish
          </Link>
        </section>
      ) : null}
      {items.length === 0 ? <p className="text-sm text-zinc-500">Savat bo&apos;sh</p> : null}
      <div className="lg:grid lg:grid-cols-[1fr_min(22rem,100%)] lg:items-start lg:gap-8">
        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 font-medium">{item.name}</p>
                <button type="button" onClick={() => removeItem(item.id)} className="shrink-0 text-sm text-red-600">O&apos;chirish</button>
              </div>
              <p className="text-sm text-zinc-500">{(item.priceCents / 100).toFixed(0)} so&apos;m</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="rounded border border-zinc-300 px-2">-</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="rounded border border-zinc-300 px-2">+</button>
              </div>
            </article>
          ))}
        </div>
        {items.length > 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-4 lg:mt-0">
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-zinc-600">Promokod (ixtiyoriy)</span>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="MASALAN VIP2026"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase outline-none focus:border-zinc-900"
                autoComplete="off"
              />
            </label>
            <p className="mb-3 text-lg font-semibold">Jami: {(totalCents / 100).toFixed(0)} so&apos;m</p>
            <Link href="/checkout" className="inline-flex w-full justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-white sm:w-auto">Buyurtmani rasmiylashtirish</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
