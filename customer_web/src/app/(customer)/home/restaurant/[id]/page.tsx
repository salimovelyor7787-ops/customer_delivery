"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
};
type Restaurant = { id: string; name: string; image_url: string | null };

export default function RestaurantPage() {
  const params = useParams<{ id: string }>();
  const supabase = createSupabaseBrowserClient();
  const { addItemWithRestaurantGuard } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const id = params.id;
      const [{ data: rest }, { data: rows }] = await Promise.all([
        supabase.from("restaurants").select("id,name,image_url").eq("id", id).single(),
        supabase.from("menu_items").select("id,restaurant_id,name,category,description,price_cents,image_url,is_available,sort_order").eq("restaurant_id", id).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      ]);
      setRestaurant((rest as Restaurant) ?? null);
      setItems((rows ?? []) as MenuItem[]);
    };
    void load();
  }, [params.id, supabase]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const category = item.category?.trim() ? item.category.trim() : "Boshqa";
      const list = map.get(category) ?? [];
      list.push(item);
      map.set(category, list);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <main className="space-y-4 p-4">
      {restaurant?.image_url ? <img src={restaurant.image_url} alt={restaurant.name} className="h-44 w-full rounded-2xl object-cover" /> : null}
      <h1 className="text-2xl font-semibold">{restaurant?.name ?? "Restoran"}</h1>
      <div className="space-y-5">
        {grouped.map(([category, lines]) => (
          <section key={category} className="space-y-2">
            <h2 className="px-1 text-lg font-semibold">{category}</h2>
            {lines.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description ? <p className="line-clamp-2 text-sm text-zinc-500">{item.description}</p> : null}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-semibold">so&apos;m {(item.price_cents / 100).toFixed(0)}</p>
                    <button
                      type="button"
                      disabled={!item.is_available}
                      onClick={() => {
                        const { switched } = addItemWithRestaurantGuard({ id: item.id, name: item.name, priceCents: item.price_cents, imageUrl: item.image_url, restaurantId: item.restaurant_id });
                        if (switched) toast("Savat boshqa restoranga almashtirildi");
                      }}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Savatga
                    </button>
                  </div>
                  <Link href={`/home/restaurant/${item.restaurant_id}/item/${item.id}`} className="mt-2 inline-block text-xs text-orange-600">Batafsil</Link>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
