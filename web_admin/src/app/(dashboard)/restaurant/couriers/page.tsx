"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type RestaurantCourier = {
  courier_id: string;
  login_email: string | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

type CourierProfile = { full_name: string | null; phone: string | null };
type RestaurantCourierRow = {
  courier_id: string;
  login_email: string | null;
  profiles: CourierProfile | CourierProfile[] | null;
};

type RestaurantOrder = {
  id: string;
  status: string;
  courier_id: string | null;
};

export default function RestaurantCouriersPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [autoAssignOwnCouriers, setAutoAssignOwnCouriers] = useState(true);
  const [couriers, setCouriers] = useState<RestaurantCourier[]>([]);
  const [fullName, setFullName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id,auto_assign_to_own_couriers")
      .eq("owner_id", user.id)
      .single();
    if (!restaurant) return;
    setRestaurantId(restaurant.id);
    setAutoAssignOwnCouriers(restaurant.auto_assign_to_own_couriers ?? true);

    const { data: links, error } = await supabase
      .from("restaurant_couriers")
      .select("courier_id,login_email,profiles(full_name,phone)")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const normalized = ((links ?? []) as RestaurantCourierRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles;
      return {
        courier_id: row.courier_id,
        login_email: row.login_email,
        profiles: profile,
      };
    });
    setCouriers(normalized);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void loadData();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const createCourier = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/restaurant/couriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, login, email, password }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setCreating(false);
    if (!response.ok) {
      toast.error(payload.error ?? "Kuryer yaratilmadi.");
      return;
    }
    toast.success("Kuryer yaratildi.");
    setFullName("");
    setLogin("");
    setEmail("");
    setPassword("");
    await loadData();
  };

  const assignAllOrdersToCouriers = async () => {
    if (!restaurantId) return;
    if (couriers.length === 0) {
      toast.error("Avval kamida bitta kuryer yarating.");
      return;
    }

    setAssigning(true);
    const courierIds = couriers.map((item) => item.courier_id);
    const { data: pendingOrders, error } = await supabase
      .from("orders")
      .select("id,status,courier_id")
      .eq("restaurant_id", restaurantId)
      .in("status", ["accepted", "cooking", "ready"])
      .is("courier_id", null)
      .order("created_at", { ascending: true });

    if (error) {
      setAssigning(false);
      toast.error(error.message);
      return;
    }

    const orders = (pendingOrders ?? []) as RestaurantOrder[];
    if (orders.length === 0) {
      setAssigning(false);
      toast("Topshiriladigan buyurtmalar yo'q.");
      return;
    }

    let updatedCount = 0;
    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      const courierId = courierIds[index % courierIds.length];
      const { error: updateError } = await supabase
        .from("orders")
        .update({ courier_id: courierId })
        .eq("id", order.id)
        .eq("restaurant_id", restaurantId)
        .is("courier_id", null);
      if (!updateError) {
        updatedCount += 1;
      }
    }

    setAssigning(false);
    toast.success(`Taqsimlandi: ${updatedCount} buyurtma.`);
  };

  const toggleDispatchMode = async () => {
    if (!restaurantId) return;
    const nextValue = !autoAssignOwnCouriers;
    setAutoAssignOwnCouriers(nextValue);
    const { error } = await supabase
      .from("restaurants")
      .update({ auto_assign_to_own_couriers: nextValue })
      .eq("id", restaurantId);
    if (error) {
      setAutoAssignOwnCouriers(!nextValue);
      toast.error(error.message);
      return;
    }
    toast.success(nextValue ? "Avto-taqsimlash yoqildi." : "Umumiy kuryer bazasi rejimi yoqildi.");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kuryerlar</h1>
          <p className="text-sm text-zinc-500">Restoranga istalgancha kuryer qo'shishingiz mumkin.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDispatchMode}
            role="switch"
            aria-checked={autoAssignOwnCouriers}
            aria-label="Buyurtmalarni o'z kuryerlariga avtomatik taqsimlash"
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              autoAssignOwnCouriers ? "bg-green-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                autoAssignOwnCouriers ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => void assignAllOrdersToCouriers()}
            disabled={assigning}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {assigning ? "Taqsimlanmoqda..." : "Barcha buyurtmalarni o'z kuryerlarimga berish"}
          </button>
        </div>
      </div>
      <p className="text-sm text-zinc-600">
        Rejim:{" "}
        <span className="font-medium">
          {autoAssignOwnCouriers ? "buyurtmalar ready bo'lganda avtomatik o'z kuryerlaringizga taqsimlanadi" : "buyurtmalar umumiy kuryer bazasiga chiqadi"}
        </span>
        .
      </p>

      <form onSubmit={createCourier} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 md:grid-cols-5">
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="F.I.O"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          placeholder="Login"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email (ixtiyoriy)"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Parol (kamida 6 ta belgi)"
          minLength={6}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={creating} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {creating ? "Yaratilmoqda..." : "Kuryer yaratish"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-[560px] text-sm md:min-w-full">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Kuryer</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {couriers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Hozircha kuryerlar yo'q.
                </td>
              </tr>
            ) : (
              couriers.map((courier) => (
                <tr key={courier.courier_id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">{courier.profiles?.full_name || "Nomsiz kuryer"}</td>
                  <td className="px-4 py-3">{courier.login_email || "—"}</td>
                  <td className="px-4 py-3">{courier.profiles?.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{courier.courier_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
