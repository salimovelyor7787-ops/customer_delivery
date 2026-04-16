"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Restaurant = { id: string; name: string; image_url: string | null };

export default function SearchPage() {
  const supabase = createSupabaseBrowserClient();
  const [query, setQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const popular = ["Burger", "Pizza", "Sushi", "Coffee", "Lavash"];

  useEffect(() => {
    supabase.from("restaurants").select("id,name,image_url").order("name", { ascending: true }).then(({ data }) => setRestaurants((data ?? []) as Restaurant[]));
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((restaurant) => (
          <Link key={restaurant.id} href={`/home/restaurant/${restaurant.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-col sm:items-stretch sm:gap-2 sm:p-0 sm:pb-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-36 sm:w-full sm:rounded-none sm:rounded-t-xl">{restaurant.image_url ? <img src={restaurant.image_url} alt={restaurant.name} className="h-full w-full object-cover" /> : null}</div>
            <p className="min-w-0 truncate font-medium sm:px-3">{restaurant.name}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
