"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type TrackedOrder = {
  id: string;
  status: string;
  created_at: string;
  total_cents: number;
  delivery_fee_cents: number;
  restaurants: { name: string } | { name: string }[] | null;
};

type TrackedOrderLine = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  menu_items: { name: string } | { name: string }[] | null;
};

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "rejected"]);
const STATUS_STEPS = [
  { key: "placed", label: "Qabul qilindi" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "on_the_way", label: "Yo'lda" },
  { key: "delivered", label: "Yetkazib berildi" },
];

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function getActiveStepIndex(status: string | undefined): number {
  const value = normalizeStatus(status ?? "");
  if (value === "confirmed" || value === "placed") return 0;
  if (value === "preparing" || value === "ready_for_pickup" || value === "picked_up") return 1;
  if (value === "on_the_way") return 2;
  if (value === "delivered") return 3;
  return 0;
}

export default function CartPage() {
  const { items, setQuantity, totalCents, removeItem, promoCode, setPromoCode } = useCart();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackedLines, setTrackedLines] = useState<TrackedOrderLine[]>([]);
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

      const selectFields = "id,status,created_at,total_cents,delivery_fee_cents,restaurants(name)";
      const loadLines = async (orderId: string) => {
        const { data: lineRows } = await supabase
          .from("order_items")
          .select("id,quantity,unit_price_cents,menu_items(name)")
          .eq("order_id", orderId);
        if (!active) return;
        setTrackedLines((lineRows as unknown as TrackedOrderLine[]) ?? []);
      };
      if (savedOrderId) {
        const { data } = await supabase
          .from("orders")
          .select(selectFields)
          .eq("id", savedOrderId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (active && data) {
          const parsed = data as unknown as TrackedOrder;
          if (TERMINAL_STATUSES.has(normalizeStatus(parsed.status))) {
            setTrackedOrder(null);
            setTrackedLines([]);
            setTrackingReady(true);
            return;
          }
          setTrackedOrder(parsed);
          await loadLines((data as { id: string }).id);
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
      const parsed = (data as unknown as TrackedOrder) ?? null;
      if (parsed && TERMINAL_STATUSES.has(normalizeStatus(parsed.status))) {
        setTrackedOrder(null);
        setTrackedLines([]);
        setTrackingReady(true);
        return;
      }
      setTrackedOrder(parsed);
      if (parsed?.id) {
        await loadLines(parsed.id);
      } else {
        setTrackedLines([]);
      }
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

  const activeStepIndex = getActiveStepIndex(trackedOrder?.status);
  const trackedItemsSubtotal = trackedLines.reduce((sum, line) => sum + line.quantity * line.unit_price_cents, 0);
  const trackedTotalCents = trackedOrder?.total_cents ?? trackedItemsSubtotal + (trackedOrder?.delivery_fee_cents ?? 0);

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Savat</h1>
      {trackingReady && items.length === 0 && trackedOrder ? (
        <div className="mx-auto w-full max-w-md space-y-3">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold text-zinc-900">Buyurtmangiz yo&apos;lda</h2>
                <p className="mt-1 text-sm text-zinc-500">Buyurtma #{trackedOrder.id.slice(0, 6).toUpperCase()}</p>
              </div>
              <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                Yordam
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="grid grid-cols-4 gap-2">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <div key={step.key} className="relative text-center">
                    {idx < STATUS_STEPS.length - 1 ? (
                      <span className={`absolute left-[52%] top-3 block h-0.5 w-full ${idx < activeStepIndex ? "bg-green-500" : "bg-zinc-200"}`} />
                    ) : null}
                    <div className="relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
                      {done ? <CheckCircle2 className={`h-5 w-5 ${isCurrent ? "text-orange-500" : "text-green-600"}`} /> : <Circle className="h-5 w-5 text-zinc-300" />}
                    </div>
                    <p className={`mt-1 text-xs ${done ? "text-zinc-800" : "text-zinc-400"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4" /> Xavotir olmang, buyurtmangiz nazoratda.
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">Agar muammo bo&apos;lsa, sizga darhol xabar beramiz.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="mb-2 text-lg font-semibold text-zinc-900">Buyurtma tafsilotlari</p>
            <div className="space-y-2">
              {trackedLines.map((line) => (
                <article key={line.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{Array.isArray(line.menu_items) ? (line.menu_items[0]?.name ?? "Mahsulot") : (line.menu_items?.name ?? "Mahsulot")}</p>
                    <p className="text-sm text-zinc-500">{line.quantity} x {(line.unit_price_cents / 100).toFixed(0)} so&apos;m</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-zinc-700">{((line.quantity * line.unit_price_cents) / 100).toFixed(0)} so&apos;m</p>
                </article>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between text-zinc-600"><span>{restaurantName}</span><span>{(trackedItemsSubtotal / 100).toFixed(0)} so&apos;m</span></div>
              <div className="flex justify-between text-zinc-600"><span>Yetkazib berish</span><span>{((trackedOrder.delivery_fee_cents ?? 0) / 100).toFixed(0)} so&apos;m</span></div>
              <div className="flex justify-between text-base font-semibold text-zinc-900"><span>Jami</span><span>{(trackedTotalCents / 100).toFixed(0)} so&apos;m</span></div>
            </div>
          </section>
        </div>
      ) : null}
      {items.length === 0 && (!trackingReady || !trackedOrder) ? <p className="text-sm text-zinc-500">Savat bo&apos;sh</p> : null}
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
