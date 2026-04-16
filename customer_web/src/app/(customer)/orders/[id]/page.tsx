"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createSupabaseBrowserClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
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
      <main className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Buyurtma</h1>
        <p className="text-sm text-zinc-600">Buyurtmani ko&apos;rish uchun login qiling.</p>
        <Link href={`/login?next=/orders/${id}`} className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-white">Kirish</Link>
      </main>
    );
  }

  const restaurantName =
    order?.restaurants == null ? "Restoran" : Array.isArray(order.restaurants) ? (order.restaurants[0]?.name ?? "Restoran") : order.restaurants.name;

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Buyurtma</h1>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="font-medium">{restaurantName}</p>
        <p className="text-sm text-zinc-500">Status: {order?.status ?? "—"}</p>
        <p className="text-sm text-zinc-500">Sana: {order ? new Date(order.created_at).toLocaleString() : "—"}</p>
        <p className="mt-2 font-semibold">Jami: so&apos;m {order ? (order.total_cents / 100).toFixed(0) : "0"}</p>
      </div>
      <div className="space-y-2">
        {lines.map((line) => (
          <article key={line.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="font-medium">{Array.isArray(line.menu_items) ? (line.menu_items[0]?.name ?? "Mahsulot") : (line.menu_items?.name ?? "Mahsulot")}</p>
            <p className="text-sm text-zinc-500">{line.quantity} x so&apos;m {(line.unit_price_cents / 100).toFixed(0)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
