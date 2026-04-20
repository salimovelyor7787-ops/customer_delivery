"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type OrderRow = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  restaurants: { name: string } | { name: string }[] | null;
};

const TERMINAL = ["delivered", "cancelled", "rejected"];

export default function OrdersPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoggedIn(false);
        setRows([]);
        return;
      }
      setLoggedIn(true);
      const { data } = await supabase.from("orders").select("id,status,total_cents,created_at,restaurants(name)").order("created_at", { ascending: false });
      setRows(((data ?? []) as unknown as OrderRow[]) ?? []);
    };
    void load();
  }, [supabase]);

  const active = useMemo(() => rows.filter((row) => !TERMINAL.includes(row.status.toLowerCase())), [rows]);
  const history = useMemo(() => rows.filter((row) => TERMINAL.includes(row.status.toLowerCase())), [rows]);

  if (loggedIn === false) {
    return (
      <main className="space-y-4 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Buyurtmalar</h1>
        <p className="text-sm text-zinc-600">Buyurtmalarni ko&apos;rish uchun login qiling.</p>
        <Link href="/login?next=/orders" className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-white">Kirish</Link>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Buyurtmalar</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Faol</h2>
        {active.length === 0 ? <p className="text-sm text-zinc-500">Faol buyurtma yo&apos;q.</p> : null}
        {active.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-xl border border-zinc-200 bg-white p-3">
            <p className="font-medium">{Array.isArray(order.restaurants) ? (order.restaurants[0]?.name ?? "Restoran") : (order.restaurants?.name ?? "Restoran")}</p>
            <p className="text-sm text-zinc-500">{order.status}</p>
          </Link>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tarix</h2>
        {history.length === 0 ? <p className="text-sm text-zinc-500">Tarix bo&apos;sh.</p> : null}
        {history.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-xl border border-zinc-200 bg-white p-3">
            <p className="font-medium">{Array.isArray(order.restaurants) ? (order.restaurants[0]?.name ?? "Restoran") : (order.restaurants?.name ?? "Restoran")}</p>
            <p className="text-sm text-zinc-500">{order.status}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
