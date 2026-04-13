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
        <h1 className="text-2xl font-semibold">All Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="pending">pending</option>
          <option value="accepted">accepted</option>
          <option value="cooking">cooking</option>
          <option value="ready">ready</option>
          <option value="picked_up">picked_up</option>
          <option value="delivered">delivered</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Courier</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">#{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{order.status}</td>
                <td className="px-4 py-3">${(Number(order.total_cents) / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs">{order.restaurant_id}</td>
                <td className="px-4 py-3 text-xs">{order.courier_id ?? "unassigned"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
