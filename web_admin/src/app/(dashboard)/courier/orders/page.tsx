"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type CourierOrder = {
  id: string;
  status: string;
  total_cents: number;
  courier_id: string | null;
  restaurant_id: string;
  guest_lat: number | null;
  guest_lng: number | null;
};
const supabase = createSupabaseBrowserClient();
const ASSIGNED_ACTIVE_STATUSES = ["accepted", "cooking", "ready", "picked_up", "on_the_way"];

export default function CourierOrdersPage() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(
    async (currentUserId: string) => {
      const [assignedRes, publicPoolRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id,status,total_cents,courier_id,restaurant_id,guest_lat,guest_lng")
          .eq("courier_id", currentUserId)
          .in("status", ASSIGNED_ACTIVE_STATUSES),
        supabase
          .from("orders")
          .select("id,status,total_cents,courier_id,restaurant_id,guest_lat,guest_lng")
          .is("courier_id", null)
          .eq("status", "ready"),
      ]);

      if (assignedRes.error) {
        toast.error(assignedRes.error.message);
        return;
      }
      if (publicPoolRes.error) {
        toast.error(publicPoolRes.error.message);
        return;
      }

      const merged = [...(assignedRes.data ?? []), ...(publicPoolRes.data ?? [])] as CourierOrder[];
      const deduped = Array.from(new Map(merged.map((order) => [order.id, order])).values());
      setOrders(deduped);
    },
    [],
  );

  useEffect(() => {
    const boot = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadOrders(user.id);
      setLoading(false);
    };
    void boot();
  }, [loadOrders]);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => void loadOrders(userId);
    const poll = window.setInterval(refresh, 8000);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel(`courier-orders-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .subscribe();

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, loadOrders]);

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ courier_id: userId, status: "picked_up" }).eq("id", orderId).is("courier_id", null);
    if (error) return toast.error(error.message);
    toast.success("Buyurtma qabul qilindi");
    await loadOrders(userId);
  };

  const startDelivery = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "picked_up" })
      .eq("id", orderId)
      .eq("courier_id", userId)
      .eq("status", "ready");
    if (error) return toast.error(error.message);
    toast.success("Buyurtma olib ketildi");
    await loadOrders(userId);
  };

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("courier_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Yetkazildi deb belgilandi");
    await loadOrders(userId);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Mening buyurtmalarim</h1>
      <p className="text-sm text-zinc-500">
        {loading ? "Yuklanmoqda..." : "Bu yerda sizga biriktirilgan buyurtmalar va umumiy bazadagi tayyor buyurtmalar ko'rsatiladi."}
      </p>
      <div className="grid gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">#{order.id.slice(0, 8)}</p>
                <p className="text-sm text-zinc-500">{order.status}</p>
              </div>
              <div className="flex gap-2">
                {order.guest_lat != null && order.guest_lng != null ? (
                  <a
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs"
                    href={`https://www.google.com/maps?q=${order.guest_lat},${order.guest_lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lokatsiya
                  </a>
                ) : null}
                {!order.courier_id ? (
                  <button className="rounded-lg bg-zinc-900 px-3 py-1 text-xs text-white" onClick={() => acceptOrder(order.id)}>
                    Qabul qilish
                  </button>
                ) : null}
                {order.courier_id === userId && order.status === "ready" ? (
                  <button className="rounded-lg bg-zinc-900 px-3 py-1 text-xs text-white" onClick={() => startDelivery(order.id)}>
                    Olib ketdim
                  </button>
                ) : null}
                {order.status === "picked_up" ? (
                  <button className="rounded-lg border border-zinc-300 px-3 py-1 text-xs" onClick={() => markDelivered(order.id)}>
                    Yetkazildi
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
