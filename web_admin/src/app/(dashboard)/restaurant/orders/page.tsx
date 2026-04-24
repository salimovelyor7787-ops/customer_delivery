"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

/** PostgREST may return a single row or a one-element array for nested FK selects. */
type MenuItemsNested = { name: string | null; description: string | null } | { name: string | null; description: string | null }[] | null;

type OrderLine = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  selected_option_ids: string[] | null;
  menu_items: MenuItemsNested;
};

function menuItemDisplayName(menuItems: MenuItemsNested): string {
  if (menuItems == null) return "Mahsulot";
  if (Array.isArray(menuItems)) {
    return menuItems[0]?.name?.trim() || "Mahsulot";
  }
  return menuItems.name?.trim() || "Mahsulot";
}

function menuItemDescription(menuItems: MenuItemsNested): string {
  if (menuItems == null) return "";
  if (Array.isArray(menuItems)) {
    return menuItems[0]?.description?.trim() || "";
  }
  return menuItems.description?.trim() || "";
}

type RestaurantOrder = {
  id: string;
  status: string;
  total_cents: number;
  restaurant_id: string;
  created_at: string | null;
  order_items: OrderLine[] | null;
};

function getNextRestaurantAction(status: string): { value: string; label: string } | null {
  switch (status) {
    case "placed":
      return { value: "accepted", label: "Qabul qilish" };
    case "accepted":
      return { value: "cooking", label: "Tayyorlash" };
    case "cooking":
      return { value: "ready", label: "Tayyor" };
    default:
      return null;
  }
}

function isArchivedStatus(status: string): boolean {
  return status === "delivered" || status === "cancelled";
}

export default function RestaurantOrdersPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [autoAssignOwnCouriers, setAutoAssignOwnCouriers] = useState(true);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const initialLoadedRef = useRef(false);

  const playNewOrderSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.14);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // no-op: autoplay/browser policy may block sound until user interaction
    }
  }, []);

  const loadOrders = useCallback(async (opts?: { silent?: boolean }) => {
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
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,status,total_cents,restaurant_id,created_at,order_items(id,quantity,unit_price_cents,selected_option_ids,menu_items(name,description))",
      )
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const nextOrders = (data ?? []) as RestaurantOrder[];
    const nextIds = new Set(nextOrders.map((o) => o.id));
    const hadInitial = initialLoadedRef.current;
    const newCount = hadInitial ? nextOrders.filter((o) => !knownOrderIdsRef.current.has(o.id)).length : 0;

    knownOrderIdsRef.current = nextIds;
    initialLoadedRef.current = true;
    setOrders(nextOrders);

    if ((opts?.silent ?? false) === false && newCount > 0 && document.visibilityState === "visible") {
      playNewOrderSound();
      toast.success(`Yangi buyurtma: +${newCount}`);
    }
  }, [supabase, playNewOrderSound]);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) void loadOrders({ silent: true });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!restaurantId) return;

    // Fallback polling in case realtime channel is disrupted.
    const poll = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    const onFocus = () => void loadOrders();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadOrders();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          void loadOrders();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, loadOrders]);

  const activeOrders = useMemo(() => orders.filter((o) => !isArchivedStatus(o.status)), [orders]);
  const archiveOrders = useMemo(() => orders.filter((o) => isArchivedStatus(o.status)), [orders]);
  const visibleOrders = tab === "active" ? activeOrders : archiveOrders;

  const distributeUnassignedOrdersToOwnCouriers = useCallback(async () => {
    if (!restaurantId) return;
    const { data: links, error: linksError } = await supabase
      .from("restaurant_couriers")
      .select("courier_id")
      .eq("restaurant_id", restaurantId);
    if (linksError) {
      toast.error(linksError.message);
      return;
    }

    const courierIds = (links ?? []).map((row) => row.courier_id as string).filter(Boolean);
    if (courierIds.length === 0) {
      return;
    }

    const { data: pendingOrders, error: pendingError } = await supabase
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .in("status", ["accepted", "cooking", "ready"])
      .is("courier_id", null)
      .order("created_at", { ascending: true });
    if (pendingError) {
      toast.error(pendingError.message);
      return;
    }

    const ordersToAssign = pendingOrders ?? [];
    for (let index = 0; index < ordersToAssign.length; index += 1) {
      const order = ordersToAssign[index];
      const courierId = courierIds[index % courierIds.length];
      await supabase
        .from("orders")
        .update({ courier_id: courierId })
        .eq("id", order.id)
        .eq("restaurant_id", restaurantId)
        .is("courier_id", null);
    }
  }, [restaurantId, supabase]);

  const updateStatus = async (id: string, status: string) => {
    if (!restaurantId) return;
    const patch: { status: string; courier_id?: string | null } = { status };
    if (status === "ready") {
      // Keep ready orders unassigned so all linked couriers can see and accept them.
      patch.courier_id = null;
    }
    const { error } = await supabase.from("orders").update(patch).eq("id", id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Buyurtma yangilandi");
    await loadOrders();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Buyurtmalar</h1>

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === "active" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Faol ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("archive")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === "archive" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Arxiv ({archiveOrders.length})
        </button>
      </div>

      <p className="text-sm text-zinc-600">
        Yetkazilgan buyurtmalar avtomatik ravishda <span className="font-medium">Arxiv</span> bo'limiga tushadi (holat:{" "}
        <span className="font-medium">delivered</span> yoki <span className="font-medium">cancelled</span>).
      </p>

      <div className="grid gap-3">
        {visibleOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            {tab === "active" ? "Faol buyurtmalar yo'q." : "Arxiv bo'sh."}
          </p>
        ) : (
          visibleOrders.map((order) => {
            const next = getNextRestaurantAction(order.status);
            const lines = order.order_items ?? [];
            return (
              <div key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-zinc-500">
                      Holat: <span className="font-medium text-zinc-800">{order.status}</span>
                      {order.created_at ? (
                        <span className="ml-2 text-zinc-400">
                          · {new Date(order.created_at).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">Jami: {(order.total_cents / 100).toFixed(0)} so'm</p>
                  </div>
                  {tab === "active" && next ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, next.value)}
                      className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      {next.label}
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Taomlar</p>
                  {lines.length === 0 ? (
                    <p className="text-sm text-zinc-400">Pozitsiyalar yuklanmadi yoki ro'yxat bo'sh.</p>
                  ) : (
                    <ul className="space-y-2">
                      {lines.map((line) => {
                        const name = menuItemDisplayName(line.menu_items);
                        const description = menuItemDescription(line.menu_items);
                        const extras =
                          line.selected_option_ids && line.selected_option_ids.length > 0
                            ? ` (+${line.selected_option_ids.length} qo'shimcha)`
                            : "";
                        return (
                          <li key={line.id} className="flex flex-wrap justify-between gap-2 text-sm">
                            <span className="min-w-0 text-zinc-800">
                              <span>
                                {name}
                                {extras}
                                <span className="text-zinc-500"> × {line.quantity}</span>
                              </span>
                              {description ? <span className="mt-0.5 block text-xs text-zinc-500">{description}</span> : null}
                            </span>
                            <span className="tabular-nums text-zinc-600">
                              {((line.unit_price_cents * line.quantity) / 100).toFixed(0)} so'm
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {tab === "active" && (order.status === "ready" || order.status === "picked_up") ? (
                  <p className="mt-3 text-xs text-orange-700">Kuryer yetkazishni boshlaguncha kuting (holat: {order.status}).</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
