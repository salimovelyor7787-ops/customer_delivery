"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Category = { id: string; name: string };
type Restaurant = { id: string; name: string; image_url: string | null; is_open: boolean; category_id: string | null };
type Banner = { id: string; image_url: string; title: string | null };
type DealItem = { id: string; restaurant_id: string; name: string; image_url: string | null; price_cents: number; deal_price_cents: number | null };

export default function CustomerHomePage() {
  const supabase = createSupabaseBrowserClient();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const [{ data: cats }, { data: rests }, { data: bannerRows }, { data: dealRows }, { data: pushRows }] = await Promise.all([
        supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
        supabase.from("restaurants").select("id,name,image_url,is_open,category_id").order("name", { ascending: true }),
        supabase.from("banners").select("id,image_url,title").eq("active", true).order("sort_order", { ascending: true }).limit(5),
        supabase.from("menu_items").select("id,restaurant_id,name,image_url,price_cents,deal_price_cents").eq("is_available", true).eq("is_deal", true).not("deal_price_cents", "is", null).order("sort_order", { ascending: true }).limit(10),
        supabase.from("push_notifications").select("id").eq("is_active", true).limit(1),
      ]);
      setCategories((cats ?? []) as Category[]);
      setRestaurants((rests ?? []) as Restaurant[]);
      setBanners((bannerRows ?? []) as Banner[]);
      setDeals((dealRows ?? []) as DealItem[]);
      setHasNotifications((pushRows ?? []).length > 0);
    };
    void load();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (selectedCategoryId === "all") return restaurants;
    return restaurants.filter((restaurant) => restaurant.category_id === selectedCategoryId);
  }, [restaurants, selectedCategoryId]);

  return (
    <main className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Yetkazib berish</p>
          <h1 className="text-2xl font-semibold">Chust shahri bo&apos;ylab</h1>
        </div>
        <Link href="/home/notifications" className="relative rounded-xl border border-zinc-200 bg-white p-2.5">
          <Bell className="h-5 w-5" />
          {hasNotifications ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {banners.map((banner) => (
            <div key={banner.id} className="relative h-36 min-w-[280px] overflow-hidden rounded-2xl bg-zinc-100">
              <img src={banner.image_url} alt={banner.title ?? "Banner"} className="h-full w-full object-cover" />
              {banner.title ? <p className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-xs text-white">{banner.title}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSelectedCategoryId("all")} className={`rounded-full border px-3 py-1.5 text-sm ${selectedCategoryId === "all" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-300"}`}>Barchasi</button>
        {categories.map((category) => (
          <button type="button" key={category.id} onClick={() => setSelectedCategoryId(category.id)} className={`rounded-full border px-3 py-1.5 text-sm ${selectedCategoryId === category.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-300"}`}>
            {category.name}
          </button>
        ))}
      </div>

      {deals.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Chegirmalar va aksiyalar</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {deals.map((deal) => (
              <Link href={`/home/restaurant/${deal.restaurant_id}`} key={deal.id} className="min-w-[220px] overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="h-24 bg-zinc-100">{deal.image_url ? <img src={deal.image_url} alt={deal.name} className="h-full w-full object-cover" /> : null}</div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{deal.name}</p>
                  <p className="text-sm font-semibold text-orange-600">so&apos;m {((deal.deal_price_cents ?? 0) / 100).toFixed(0)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3">
        {filtered.map((restaurant) => (
          <Link href={`/home/restaurant/${restaurant.id}`} key={restaurant.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="h-36 w-full bg-zinc-100">{restaurant.image_url ? <img src={restaurant.image_url} alt={restaurant.name} className="h-full w-full object-cover" /> : null}</div>
            <div className="p-3">
              <p className="font-semibold">{restaurant.name}</p>
              <p className={`text-xs ${restaurant.is_open ? "text-green-600" : "text-red-500"}`}>{restaurant.is_open ? "Ochiq" : "Yopiq"}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
