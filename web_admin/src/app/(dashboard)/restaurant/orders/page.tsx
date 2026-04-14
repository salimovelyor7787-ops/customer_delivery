"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type RestaurantOrder = { id: string; status: string; total_cents: number; restaurant_id: string };

const nextStatuses: { value: string; label: string }[] = [
  { value: "accepted", label: "Qabul qilish" },
  { value: "cooking", label: "Tayyorlash" },
  { value: "ready", label: "Tayyor" },
];
const supabase = createSupabaseBrowserClient();

export default function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");

  useEffect(() => {
    const loadOrders = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);
      const { data } = await supabase.from("orders").select("id,status,total_cents,restaurant_id").eq("restaurant_id", restaurant.id);
      setOrders((data ?? []) as RestaurantOrder[]);
    };
    void loadOrders();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Buyurtma yangilandi");
    const { data } = await supabase.from("orders").select("id,status,total_cents,restaurant_id").eq("restaurant_id", restaurantId);
    setOrders((data ?? []) as RestaurantOrder[]);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Kiruvchi buyurtmalar</h1>
      <div className="grid gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">#{order.id.slice(0, 8)}</p>
                <p className="text-sm text-zinc-500">Joriy holat: {order.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateStatus(order.id, s.value)}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
