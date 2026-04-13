"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type CourierOrder = { id: string; status: string; total_cents: number; courier_id: string | null };
const supabase = createSupabaseBrowserClient();

export default function CourierOrdersPage() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const loadOrders = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("orders")
        .select("id,status,total_cents,courier_id")
        .or(`courier_id.eq.${user.id},courier_id.is.null`)
        .in("status", ["ready", "picked_up", "delivered"]);

      setOrders((data ?? []) as CourierOrder[]);
    };
    void loadOrders();
  }, []);

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ courier_id: userId, status: "picked_up" }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Order accepted");
    const { data } = await supabase
      .from("orders")
      .select("id,status,total_cents,courier_id")
      .or(`courier_id.eq.${userId},courier_id.is.null`)
      .in("status", ["ready", "picked_up", "delivered"]);
    setOrders((data ?? []) as CourierOrder[]);
  };

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("courier_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Order delivered");
    const { data } = await supabase
      .from("orders")
      .select("id,status,total_cents,courier_id")
      .or(`courier_id.eq.${userId},courier_id.is.null`)
      .in("status", ["ready", "picked_up", "delivered"]);
    setOrders((data ?? []) as CourierOrder[]);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Assigned Orders</h1>
      <div className="grid gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">#{order.id.slice(0, 8)}</p>
                <p className="text-sm text-zinc-500">{order.status}</p>
              </div>
              <div className="flex gap-2">
                {!order.courier_id ? (
                  <button className="rounded-lg bg-zinc-900 px-3 py-1 text-xs text-white" onClick={() => acceptOrder(order.id)}>
                    Accept
                  </button>
                ) : null}
                {order.status === "picked_up" ? (
                  <button className="rounded-lg border border-zinc-300 px-3 py-1 text-xs" onClick={() => markDelivered(order.id)}>
                    Mark delivered
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
