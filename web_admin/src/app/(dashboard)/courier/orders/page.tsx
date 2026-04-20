"use client";

import { useEffect, useState } from "react";
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

export default function CourierOrdersPage() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [restaurantId, setRestaurantId] = useState<string>("");

  useEffect(() => {
    const loadOrders = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: relation, error: relationError } = await supabase
        .from("restaurant_couriers")
        .select("restaurant_id")
        .eq("courier_id", user.id)
        .maybeSingle();
      if (relationError) {
        toast.error(relationError.message);
        return;
      }
      if (!relation?.restaurant_id) {
        setRestaurantId("");
        setOrders([]);
        return;
      }
      setRestaurantId(relation.restaurant_id);

      const { data } = await supabase
        .from("orders")
        .select("id,status,total_cents,courier_id,restaurant_id,guest_lat,guest_lng")
        .eq("restaurant_id", relation.restaurant_id)
        .eq("courier_id", user.id)
        .in("status", ["ready", "picked_up", "delivered"]);

      setOrders((data ?? []) as CourierOrder[]);
    };
    void loadOrders();
  }, []);

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("courier_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Yetkazildi deb belgilandi");
    const { data } = await supabase
      .from("orders")
      .select("id,status,total_cents,courier_id,guest_lat,guest_lng")
      .or(`courier_id.eq.${userId},courier_id.is.null`)
      .in("status", ["ready", "picked_up", "delivered"]);
    setOrders((data ?? []) as CourierOrder[]);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Mening buyurtmalarim</h1>
      {!restaurantId ? <p className="text-sm text-zinc-500">Siz hali birorta restoranga biriktirilmagansiz.</p> : null}
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
