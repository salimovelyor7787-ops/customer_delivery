"use client";

import { useEffect, useMemo, useState } from "react";
import { RestaurantHeroCard } from "@/components/customer/restaurant-hero-card";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Restaurant = { id: string; name: string; image_url: string | null; is_open: boolean; category_id: string | null };

export default function SearchPage() {
  const supabase = createSupabaseBrowserClient();
  const [query, setQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const popular = ["Burger", "Pizza", "Sushi", "Coffee", "Lavash"];

  useEffect(() => {
    const load = async () => {
      const [{ data: rests }, { data: cats }] = await Promise.all([
        supabase.from("restaurants").select("id,name,image_url,is_open,category_id").order("name", { ascending: true }),
        supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
      ]);
      setRestaurants((rests ?? []) as Restaurant[]);
      setCategoryNames(Object.fromEntries((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name])));
    };
    void load();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => r.name.toLowerCase().includes(q));
  }, [query, restaurants]);

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Qidiruv</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Restoran qidiring..." className="w-full max-w-2xl rounded-xl border border-zinc-300 px-3 py-2 lg:py-3" />
      <div className="flex flex-wrap gap-2">
        {popular.map((item) => (
          <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-700">
            {item}
          </button>
        ))}
      </div>
      <section className="space-y-4 sm:space-y-5">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Restoran topilmadi</p>
        ) : (
          filtered.map((restaurant, index) => (
            <RestaurantHeroCard
              key={restaurant.id}
              id={restaurant.id}
              name={restaurant.name}
              imageUrl={restaurant.image_url}
              categoryLabel={restaurant.category_id ? (categoryNames[restaurant.category_id] ?? null) : null}
              isOpen={restaurant.is_open}
              listIndex={index}
            />
          ))
        )}
      </section>
    </main>
  );
}
