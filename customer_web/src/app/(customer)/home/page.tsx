"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Search, Store } from "lucide-react";
import { RestaurantHeroCard } from "@/components/customer/restaurant-hero-card";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  image_url: string | null;
  is_open: boolean;
  category_id: string | null;
  category_ids: string[] | null;
};
type Banner = { id: string; image_url: string; title: string | null };
type DealItem = { id: string; restaurant_id: string; name: string; image_url: string | null; price_cents: number; deal_price_cents: number | null };
type NearbyStoreCard = { id: string; title: string | null; image_url: string; restaurant_id: string | null };
type HomeCachePayload = {
  restaurants: Restaurant[];
  categories: Record<string, string>;
  banners: Banner[];
  deals: DealItem[];
  nearbyCards: NearbyStoreCard[];
  hasNotifications: boolean;
};

const HOME_CACHE_KEY = "customer_home_cache_v1";
const HOME_CACHE_TTL_MS = 2 * 60 * 1000;

export default function CustomerHomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [nearbyCards, setNearbyCards] = useState<NearbyStoreCard[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [hasNotifications, setHasNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const cached = getCachedValue<HomeCachePayload>(HOME_CACHE_KEY);
    if (cached) {
      Promise.resolve().then(() => {
        setRestaurants(cached.restaurants);
        setCategoryNames(cached.categories);
        setBanners(cached.banners);
        setDeals(cached.deals);
        setNearbyCards(cached.nearbyCards);
        setHasNotifications(cached.hasNotifications);
      });
    }

    const loadFromApi = async (): Promise<HomeCachePayload | null> => {
      try {
        const res = await fetch("/api/home");
        if (!res.ok) return null;
        const json: unknown = await res.json();
        if (!json || typeof json !== "object" || "error" in json) return null;
        const data = json as HomeCachePayload;
        if (!Array.isArray(data.restaurants)) return null;
        return data;
      } catch {
        return null;
      }
    };

    const load = async () => {
      const fromApi = await loadFromApi();
      if (fromApi) {
        setRestaurants(fromApi.restaurants);
        setCategoryNames(fromApi.categories);
        setBanners(fromApi.banners);
        setDeals(fromApi.deals);
        setNearbyCards(fromApi.nearbyCards);
        setHasNotifications(fromApi.hasNotifications);
        setCachedValue(HOME_CACHE_KEY, fromApi, HOME_CACHE_TTL_MS);
        return;
      }

      const [{ data: rests }, { data: catRows }, { data: bannerRows }, { data: dealRows }, { data: nearbyRows }, { data: pushRows }] = await Promise.all([
        supabase.from("restaurants").select("id,name,image_url,is_open,category_id,category_ids").order("name", { ascending: true }),
        supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
        supabase.from("banners").select("id,image_url,title").eq("active", true).order("sort_order", { ascending: true }).limit(5),
        supabase.from("menu_items").select("id,restaurant_id,name,image_url,price_cents,deal_price_cents").eq("is_available", true).eq("is_deal", true).not("deal_price_cents", "is", null).order("sort_order", { ascending: true }).limit(10),
        supabase.from("home_nearby_cards").select("id,title,image_url,restaurant_id").eq("is_active", true).order("sort_order", { ascending: true }).limit(20),
        supabase.from("push_notifications").select("id").eq("is_active", true).limit(1),
      ]);
      const nextPayload: HomeCachePayload = {
        restaurants: (rests ?? []) as Restaurant[],
        categories: Object.fromEntries((catRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
        banners: (bannerRows ?? []) as Banner[],
        deals: (dealRows ?? []) as DealItem[],
        nearbyCards: (nearbyRows ?? []) as NearbyStoreCard[],
        hasNotifications: (pushRows ?? []).length > 0,
      };

      setRestaurants(nextPayload.restaurants);
      setCategoryNames(nextPayload.categories);
      setBanners(nextPayload.banners);
      setDeals(nextPayload.deals);
      setNearbyCards(nextPayload.nearbyCards);
      setHasNotifications(nextPayload.hasNotifications);
      setCachedValue(HOME_CACHE_KEY, nextPayload, HOME_CACHE_TTL_MS);
    };
    void load();
  }, [supabase]);

  const storeCarouselItems = useMemo((): NearbyStoreCard[] => {
    if (nearbyCards.length > 0) return nearbyCards;
    return restaurants.slice(0, 10).map((r) => ({
      id: `fallback-${r.id}`,
      title: r.name,
      image_url: r.image_url ?? "",
      restaurant_id: r.id,
    }));
  }, [nearbyCards, restaurants]);

  const getRestaurantCategoryNames = useCallback(
    (restaurant: Restaurant): string[] => {
      const ids = restaurant.category_ids && restaurant.category_ids.length > 0
        ? restaurant.category_ids
        : restaurant.category_id
          ? [restaurant.category_id]
          : [];
      return ids.map((id) => categoryNames[id]).filter(Boolean);
    },
    [categoryNames],
  );

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      const categoryText = getRestaurantCategoryNames(r).join(" ").toLowerCase();
      return categoryText.includes(q);
    });
  }, [restaurants, searchQuery, getRestaurantCategoryNames]);

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 sm:text-sm">Yetkazib berish</p>
          <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">Chust shahri bo&apos;ylab</h1>
        </div>
        <Link href="/home/notifications" className="relative shrink-0 rounded-xl border border-zinc-200 bg-white p-2.5">
          <Bell className="h-5 w-5" />
          {hasNotifications ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
        </Link>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Restoran qidiring..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 sm:py-3 sm:text-base"
          autoComplete="off"
        />
      </label>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-x-visible lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="relative h-36 min-w-[280px] overflow-hidden rounded-2xl bg-zinc-100 md:min-w-0 md:h-40 lg:h-44">
              <Image
                src={banner.image_url}
                alt={banner.title ?? "Banner"}
                fill
                sizes="(max-width: 768px) 280px, (max-width: 1024px) 50vw, 33vw"
                className="h-full w-full object-cover"
              />
              {banner.title ? <p className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-xs text-white">{banner.title}</p> : null}
            </div>
          ))}
        </div>
      </div>

      {storeCarouselItems.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold sm:text-xl">Yaqin do&apos;konlar</h2>
            <Link href="/search" className="shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700">
              Hammasi
            </Link>
          </div>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {storeCarouselItems.map((card) => {
              const inner = (
                <div className="relative h-[74px] w-[108px] shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm">
                  {card.image_url ? (
                    <Image
                      src={card.image_url}
                      alt={card.title ?? "Do'kon"}
                      fill
                      sizes="108px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400">
                      <Store className="h-8 w-8" aria-hidden />
                    </div>
                  )}
                  {card.title ? (
                    <p className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white">
                      {card.title}
                    </p>
                  ) : null}
                </div>
              );
              return card.restaurant_id ? (
                <Link key={card.id} href={`/home/restaurant/${card.restaurant_id}`} className="block transition active:scale-[0.98]">
                  {inner}
                </Link>
              ) : (
                <div key={card.id} className="opacity-90">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {deals.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold sm:text-xl">Chegirmalar va bonuslar</h2>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {deals.map((deal) => {
              const oldCents = deal.price_cents;
              const newCents = deal.deal_price_cents ?? oldCents;
              return (
                <Link
                  href={`/home/restaurant/${deal.restaurant_id}`}
                  key={deal.id}
                  className="w-[148px] shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:w-[156px]"
                >
                  <div className="relative h-[72px] bg-zinc-100">
                    {deal.image_url ? (
                      <Image src={deal.image_url} alt={deal.name} fill sizes="156px" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-900">{deal.name}</p>
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                      <span className="text-[10px] text-zinc-400 line-through">{(oldCents / 100).toFixed(0)} so&apos;m</span>
                      <span className="text-xs font-semibold text-orange-600">{(newCents / 100).toFixed(0)} so&apos;m</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4 sm:space-y-5">
        {filteredRestaurants.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Restoran topilmadi</p>
        ) : (
          filteredRestaurants.map((restaurant, index) => (
            <RestaurantHeroCard
              key={restaurant.id}
              id={restaurant.id}
              name={restaurant.name}
              imageUrl={restaurant.image_url}
              priority={index === 0}
              categoryLabel={
                (() => {
                  const names = getRestaurantCategoryNames(restaurant);
                  return names.length > 0 ? names.join(", ") : null;
                })()
              }
              isOpen={restaurant.is_open}
              listIndex={index}
              compact
            />
          ))
        )}
      </section>
    </main>
  );
}

