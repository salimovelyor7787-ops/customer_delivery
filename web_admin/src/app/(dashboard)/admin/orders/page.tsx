"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type AdminOrder = {
  id: string;
  status: string;
  total_cents: number;
  restaurant_id: string;
  courier_id: string | null;
  created_at: string;
};
const supabase = createSupabaseBrowserClient();

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    const query = supabase.from("orders").select("*").order("created_at", { ascending: false });
    (status === "all" ? query : query.eq("status", status)).then(({ data }) => setOrders((data ?? []) as AdminOrder[]));
  }, [status]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Barcha buyurtmalar</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="all">Barcha holatlar</option>
          <option value="pending">pending (kutilmoqda)</option>
          <option value="accepted">accepted (qabul)</option>
          <option value="cooking">cooking (tayyorlanmoqda)</option>
          <option value="ready">ready (tayyor)</option>
          <option value="picked_up">picked_up (olib ketildi)</option>
          <option value="delivered">delivered (yetkazildi)</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Buyurtma</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Jami</th>
              <th className="px-4 py-3">Restoran</th>
              <th className="px-4 py-3">Kuryer</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">#{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{order.status}</td>
                <td className="px-4 py-3">${(Number(order.total_cents) / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs">{order.restaurant_id}</td>
                <td className="px-4 py-3 text-xs">{order.courier_id ?? "yo'q"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
