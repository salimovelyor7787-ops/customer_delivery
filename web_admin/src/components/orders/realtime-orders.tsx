"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type LiveOrder = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
};

export function RealtimeOrders({ initialOrders }: { initialOrders: LiveOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          supabase
            .from("orders")
            .select("id,status,total_cents,created_at")
            .order("created_at", { ascending: false })
            .limit(10)
            .then(({ data }) => setOrders((data ?? []) as LiveOrder[]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Live Orders</h3>
      <div className="mt-4 space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border border-zinc-100 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-900">#{order.id.slice(0, 8)}</p>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{order.status}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">${(Number(order.total_cents) / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
