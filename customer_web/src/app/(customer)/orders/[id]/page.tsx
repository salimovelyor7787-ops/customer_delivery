"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Headphones, MapPin, MessageCircle, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type OrderDetail = {
  id: string;
  status: string;
  total_cents: number;
  delivery_fee_cents: number;
  created_at: string;
  restaurants: { name: string } | { name: string }[] | null;
};

type OrderLine = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  menu_items: { name: string } | { name: string }[] | null;
};

const STATUS_STEPS = [
  { key: "placed", label: "Qabul qilindi" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "on_the_way", label: "Yo'lda" },
  { key: "delivered", label: "Yetkazib berildi" },
];

function normalizeStatus(status: string | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function getActiveStepIndex(status: string | undefined): number {
  const value = normalizeStatus(status);
  if (value === "confirmed" || value === "placed") return 0;
  if (value === "preparing" || value === "ready_for_pickup" || value === "picked_up") return 1;
  if (value === "on_the_way") return 2;
  if (value === "delivered") return 3;
  if (value === "cancelled" || value === "rejected") return 0;
  return 0;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const lastOrderId = window.localStorage.getItem("customer_last_order_id");
        if (lastOrderId === id) {
          // Allow guests to reopen their just-created order screen from local storage.
          setLoggedIn(true);
          setOrder((prev) => prev ?? { id, status: "placed", total_cents: 0, delivery_fee_cents: 0, created_at: new Date().toISOString(), restaurants: null });
          setLines([]);
          return;
        }
        setLoggedIn(false);
        return;
      }
      setLoggedIn(true);
      const [{ data: orderRow }, { data: lineRows }] = await Promise.all([
        supabase.from("orders").select("id,status,total_cents,delivery_fee_cents,created_at,restaurants(name)").eq("id", id).single(),
        supabase.from("order_items").select("id,quantity,unit_price_cents,menu_items(name)").eq("order_id", id),
      ]);
      setOrder((orderRow as unknown as OrderDetail) ?? null);
      setLines((lineRows as unknown as OrderLine[]) ?? []);
    };
    void load();
  }, [id, supabase]);

  if (loggedIn === false) {
    return (
      <main className="space-y-4 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Buyurtma</h1>
        <p className="text-sm text-zinc-600">Buyurtmani ko&apos;rish uchun login qiling.</p>
        <Link href={`/login?next=/orders/${id}`} className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-white">Kirish</Link>
      </main>
    );
  }

  const restaurantName =
    order?.restaurants == null ? "Restoran" : Array.isArray(order.restaurants) ? (order.restaurants[0]?.name ?? "Restoran") : order.restaurants.name;
  const activeStepIndex = getActiveStepIndex(order?.status);
  const itemsSubtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price_cents, 0);
  const totalCents = order?.total_cents ?? itemsSubtotal + (order?.delivery_fee_cents ?? 0);

  return (
    <main className="min-h-screen bg-zinc-50 p-4">
      <div className="mx-auto w-full max-w-md space-y-3">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">Buyurtmangiz yo&apos;lda</h1>
              <p className="mt-1 text-sm text-zinc-500">Buyurtma #{order?.id?.slice(0, 6).toUpperCase() ?? "—"}</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
              <Headphones className="h-4 w-4" /> Yordam
            </button>
          </div>
        </header>

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
                    {done ? (
                      <CheckCircle2 className={`h-5 w-5 ${isCurrent ? "text-orange-500" : "text-green-600"}`} />
                    ) : (
                      <Circle className="h-5 w-5 text-zinc-300" />
                    )}
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
          <p className="text-lg font-semibold text-zinc-900">Kuryer yo&apos;lda</p>
          <p className="text-sm text-zinc-500">Buyurtmangiz sizga yetkazilmoqda</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-zinc-900">Azizbek ★ 4.9</p>
              <p className="text-sm text-zinc-500">7 daqiqa ichida yetib boradi</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-xl border border-zinc-200 p-2.5 text-zinc-700">
                <PhoneCall className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-xl border border-zinc-200 p-2.5 text-zinc-700">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100">
            <div className="flex h-40 items-center justify-center bg-[linear-gradient(135deg,#f4f4f5,#e4e4e7)] text-zinc-500">
              <MapPin className="mr-2 h-4 w-4" /> Kuryer harakati xaritasi
            </div>
            <div className="rounded-b-xl bg-orange-50 px-3 py-2 text-sm">
              <p className="flex items-center justify-between font-medium text-orange-700">
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-4 w-4" /> Taxminiy yetkazish vaqti
                </span>
                <span>18:20-18:25</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <button type="button" className="mb-2 flex w-full items-center justify-between text-left">
            <span className="text-lg font-semibold text-zinc-900">Buyurtma tafsilotlari</span>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>
          <div className="space-y-2">
            {lines.map((line) => (
              <article key={line.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {Array.isArray(line.menu_items) ? (line.menu_items[0]?.name ?? "Mahsulot") : (line.menu_items?.name ?? "Mahsulot")}
                  </p>
                  <p className="text-sm text-zinc-500">{line.quantity} x {(line.unit_price_cents / 100).toFixed(0)} so&apos;m</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-zinc-700">
                  {((line.quantity * line.unit_price_cents) / 100).toFixed(0)} so&apos;m
                </p>
              </article>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>{restaurantName}</span>
              <span>{(itemsSubtotal / 100).toFixed(0)} so&apos;m</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Yetkazib berish</span>
              <span>{((order?.delivery_fee_cents ?? 0) / 100).toFixed(0)} so&apos;m</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-zinc-900">
              <span>Jami</span>
              <span>{(totalCents / 100).toFixed(0)} so&apos;m</span>
            </div>
          </div>
        </section>

        <button type="button" className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-500">
          Buyurtmani bekor qilish
        </button>
      </div>
    </main>
  );
}
