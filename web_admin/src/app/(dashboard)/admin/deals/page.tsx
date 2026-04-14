"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type RestaurantOption = { id: string; name: string };
type ProductRow = {
  id: string;
  name: string;
  price_cents: number;
  image_url: string | null;
  is_deal: boolean;
  deal_price_cents: number | null;
};

const supabase = createSupabaseBrowserClient();

export default function AdminDealsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showOnlyDeals, setShowOnlyDeals] = useState(false);

  const loadRestaurants = async () => {
    const { data, error } = await supabase.from("restaurants").select("id,name").order("name");
    if (error) return toast.error(error.message);
    const list = (data ?? []) as RestaurantOption[];
    setRestaurants(list);
    if (!restaurantId && list.length > 0) setRestaurantId(list[0].id);
  };

  const loadRows = async (targetRestaurantId: string) => {
    if (!targetRestaurantId) return;
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,name,price_cents,image_url,is_deal,deal_price_cents")
      .eq("restaurant_id", targetRestaurantId)
      .order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as ProductRow[]);
  };

  useEffect(() => {
    void loadRestaurants();
  }, []);

  useEffect(() => {
    if (restaurantId) void loadRows(restaurantId);
  }, [restaurantId]);

  const activeDealsCount = useMemo(() => rows.filter((r) => r.is_deal).length, [rows]);
  const visibleRows = useMemo(
    () => (showOnlyDeals ? rows.filter((row) => row.is_deal) : rows),
    [rows, showOnlyDeals],
  );

  const onToggleDeal = async (row: ProductRow) => {
    setSavingId(row.id);
    const nextDeal = !row.is_deal;
    const nextDealPrice = nextDeal ? row.deal_price_cents ?? row.price_cents : null;

    const { error } = await supabase
      .from("menu_items")
      .update({ is_deal: nextDeal, deal_price_cents: nextDealPrice })
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);

    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, is_deal: nextDeal, deal_price_cents: nextDealPrice } : item,
      ),
    );
  };

  const onDealPriceChange = (id: string, value: string) => {
    const dealPriceCents = value === "" ? null : Math.round(Number(value) * 100);
    setRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, deal_price_cents: dealPriceCents } : item)),
    );
  };

  const onSavePrice = async (row: ProductRow) => {
    if (!row.is_deal) return;
    if (!row.deal_price_cents || row.deal_price_cents <= 0) {
      return toast.error("Aksiya narxi 0 dan katta bo'lishi kerak");
    }
    if (row.deal_price_cents > row.price_cents) {
      return toast.error("Aksiya narxi asosiy narxdan yuqori bo'lmasligi kerak");
    }

    setSavingId(row.id);
    const { error } = await supabase
      .from("menu_items")
      .update({ deal_price_cents: row.deal_price_cents })
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Aksiya narxi yangilandi");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Aksiyalar</h1>
      <p className="text-sm text-zinc-500">
        Restoran tanlang, mahsulotlarni aksiya qiling va bosh sahifa karuselidagi narxni belgilang.
      </p>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <div className="flex items-center text-sm text-zinc-600">
            Faol aksiyalar: <span className="ml-2 font-semibold text-zinc-900">{activeDealsCount}</span>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showOnlyDeals}
              onChange={(e) => setShowOnlyDeals(e.target.checked)}
            />
            Faqat aksiyadagilar
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Mahsulot</th>
              <th className="px-4 py-3">Asosiy narx</th>
              <th className="px-4 py-3">Aksiya</th>
              <th className="px-4 py-3">Aksiya narxi</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{row.name}</p>
                  {row.image_url ? <p className="max-w-xs truncate text-xs text-zinc-500">{row.image_url}</p> : null}
                </td>
                <td className="px-4 py-3">${(row.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleDeal(row)}
                    disabled={savingId === row.id}
                    className={`rounded px-3 py-1 text-xs ${
                      row.is_deal ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {row.is_deal ? "Aksiyada" : "Aksiyasiz"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!row.is_deal}
                    value={row.deal_price_cents ? (row.deal_price_cents / 100).toFixed(2) : ""}
                    onChange={(e) => onDealPriceChange(row.id, e.target.value)}
                    className="w-32 rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-50"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSavePrice(row)}
                    disabled={!row.is_deal || savingId === row.id}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Saqlash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
