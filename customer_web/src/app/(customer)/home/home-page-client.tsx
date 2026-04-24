"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search, Store } from "lucide-react";
import { RestaurantHeroCard } from "@/components/customer/restaurant-hero-card";
import { PwaInstallCard } from "@/components/customer/pwa-install-card";
import { setCachedValue } from "@/lib/client-cache";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type Restaurant = {
  id: string;
  name: string;
  image_url: string | null;
  is_open: boolean;
  delivery_fee_cents: number;
  category_id: string | null;
  category_ids: string[] | null;
};
export type Banner = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  action_path: string | null;
};

function bannerHasActionUrl(actionPath: string | null | undefined): boolean {
  return Boolean(actionPath && String(actionPath).trim().length > 0);
}

function splitBannerLines(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function BannerCta({ href, label }: { href: string; label: string }) {
  const h = href.trim();
  const external = /^https?:\/\//i.test(h);
  const className =
    "inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 ring-1 ring-black/5 transition hover:bg-zinc-100 active:scale-[0.98] md:px-4 md:text-sm";
  if (external) {
    return (
      <a href={h} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }
  const path = h.startsWith("/") ? h : `/${h}`;
  return (
    <Link href={path} className={className}>
      {label}
    </Link>
  );
}
export type DealItem = {
  id: string;
  restaurant_id: string;
  name: string;
  image_url: string | null;
  price_cents: number;
  deal_price_cents: number | null;
};
export type NearbyStoreCard = { id: string; title: string | null; image_url: string; restaurant_id: string | null };
export type ServiceCard = { id: string; key: string; title: string; image_url: string | null };

export type HomePageInitialPayload = {
  restaurants: Restaurant[];
  categories: Record<string, string>;
  serviceCards: ServiceCard[];
  serviceCardsVersion: string | null;
  banners: Banner[];
  deals: DealItem[];
  nearbyCards: NearbyStoreCard[];
  hasNotifications: boolean;
};

const HOME_CACHE_KEY = "customer_home_cache_v1";
const HOME_CACHE_TTL_MS = 2 * 60 * 1000;

/** Background refresh after paint so LCP (first hero banner) is not blocked by duplicate network work. */
const REFRESH_DELAY_MS = 2800;

type Props = { initial: HomePageInitialPayload };

export function HomePageClient({ initial }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => initial.restaurants);
  const [banners, setBanners] = useState<Banner[]>(() => initial.banners);
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>(() => initial.serviceCards ?? []);
  const serviceCardsVersionRef = useRef<string | null>(initial.serviceCardsVersion ?? null);
  const [deals, setDeals] = useState<DealItem[]>(() => initial.deals);
  const [nearbyCards, setNearbyCards] = useState<NearbyStoreCard[]>(() => initial.nearbyCards);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(() => initial.categories);
  const [hasNotifications, setHasNotifications] = useState(() => initial.hasNotifications);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setCachedValue(HOME_CACHE_KEY, initial, HOME_CACHE_TTL_MS);

    const loadFromApi = async (): Promise<HomePageInitialPayload | null> => {
      try {
        const res = await fetch("/api/home");
        if (!res.ok) return null;
        const json: unknown = await res.json();
        if (!json || typeof json !== "object" || "error" in json) return null;
        const data = json as HomePageInitialPayload;
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
        // Apply service cards only when API returned a strictly newer version.
        // This prevents stale edge cache from rolling back fresh admin edits.
        if (
          Array.isArray(fromApi.serviceCards) &&
          fromApi.serviceCardsVersion &&
          (!serviceCardsVersionRef.current || fromApi.serviceCardsVersion > serviceCardsVersionRef.current)
        ) {
          setServiceCards(fromApi.serviceCards);
          serviceCardsVersionRef.current = fromApi.serviceCardsVersion;
        }
        // Keep SSR banners stable to avoid short-lived cache rollbacks after admin edits.
        setDeals(fromApi.deals);
        setNearbyCards(fromApi.nearbyCards);
        setHasNotifications(fromApi.hasNotifications);
        setCachedValue(HOME_CACHE_KEY, fromApi, HOME_CACHE_TTL_MS);
        return;
      }

      const [{ data: rests }, { data: catRows }, { data: serviceRows }, { data: bannerRows }, { data: dealRows }, { data: nearbyRows }, { data: pushRows }] =
        await Promise.all([
        supabase.from("restaurants").select("id,name,image_url,is_open,delivery_fee_cents,category_id,category_ids").order("name", { ascending: true }),
        supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
        supabase.from("home_service_cards").select("id,service_key,title,image_url,sort_order,updated_at").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase
          .from("banners")
          .select("id,image_url,title,subtitle,button_text,action_path,sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(5),
        supabase
          .from("menu_items")
          .select("id,restaurant_id,name,image_url,price_cents,deal_price_cents")
          .eq("is_available", true)
          .eq("is_deal", true)
          .not("deal_price_cents", "is", null)
          .order("sort_order", { ascending: true })
          .limit(10),
        supabase.from("home_nearby_cards").select("id,title,image_url,restaurant_id").eq("is_active", true).order("sort_order", { ascending: true }).limit(20),
        supabase.from("push_notifications").select("id").eq("is_active", true).limit(1),
      ]);
      const normalizedServiceRows = (serviceRows ?? []) as Array<{
        id: string;
        service_key: string;
        title: string;
        image_url: string | null;
        updated_at: string | null;
      }>;
      const serviceCardsVersion =
        normalizedServiceRows.reduce<string | null>((latest, row) => {
          if (!row.updated_at) return latest;
          if (!latest || row.updated_at > latest) return row.updated_at;
          return latest;
        }, null) ?? null;

      const nextPayload: HomePageInitialPayload = {
        restaurants: (rests ?? []) as Restaurant[],
        categories: Object.fromEntries((catRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
        serviceCards: normalizedServiceRows.map((c) => ({
          id: c.id,
          key: c.service_key,
          title: c.title,
          image_url: c.image_url ?? null,
        })),
        serviceCardsVersion,
        banners: (bannerRows ?? []) as Banner[],
        deals: (dealRows ?? []) as DealItem[],
        nearbyCards: (nearbyRows ?? []) as NearbyStoreCard[],
        hasNotifications: (pushRows ?? []).length > 0,
      };

      setRestaurants(nextPayload.restaurants);
      setCategoryNames(nextPayload.categories);
      setServiceCards(nextPayload.serviceCards);
      serviceCardsVersionRef.current = nextPayload.serviceCardsVersion;
      setBanners(nextPayload.banners);
      setDeals(nextPayload.deals);
      setNearbyCards(nextPayload.nearbyCards);
      setHasNotifications(nextPayload.hasNotifications);
      setCachedValue(HOME_CACHE_KEY, nextPayload, HOME_CACHE_TTL_MS);
    };

    const t = window.setTimeout(() => {
      void load();
    }, REFRESH_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [supabase, initial]);

  const storeCarouselItems = useMemo((): NearbyStoreCard[] => nearbyCards, [nearbyCards]);

  const getRestaurantCategoryNames = useCallback(
    (restaurant: Restaurant): string[] => {
      const ids =
        restaurant.category_ids && restaurant.category_ids.length > 0
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

      <PwaInstallCard variant="banner" />

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-x-visible lg:grid-cols-3">
          {banners.map((banner, index) => {
            const hasLink = bannerHasActionUrl(banner.action_path);
            const sub = banner.subtitle?.trim() ?? "";
            const subtitleLines = sub ? splitBannerLines(sub) : [];
            const btn = banner.button_text?.trim() ?? "";
            /** Promo line often lives in `button_text` even when there is no URL — show as text, not only hide the button. */
            const showButtonTextAsPlain =
              !hasLink && btn.length > 0 && (sub.length === 0 || btn !== sub);
            return (
              <div key={banner.id} className="relative h-[142px] min-w-full overflow-hidden rounded-2xl bg-zinc-100 sm:h-[156px] md:min-w-0 lg:h-[168px]">
                <Image
                  src={banner.image_url}
                  alt={banner.title ?? "Banner"}
                  fill
                  sizes="(max-width: 768px) 280px, (max-width: 1024px) 50vw, 33vw"
                  className="h-full w-full object-cover"
                  priority={index === 0}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding={index === 0 ? "sync" : "async"}
                />
                <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-stretch gap-1.5 p-3 text-left md:gap-2 md:p-4">
                  {banner.title?.trim() ? (
                    <h3 className="text-balance text-xl font-bold leading-snug text-white md:text-xl md:leading-tight">{banner.title.trim()}</h3>
                  ) : null}
                  {subtitleLines.length > 0 ? (
                    <p className="text-pretty text-sm font-semibold leading-normal text-white/90 md:text-sm md:leading-snug">
                      {subtitleLines.map((line, lineIdx) => (
                        <span key={`${banner.id}-subtitle-${lineIdx}`} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {showButtonTextAsPlain ? (
                    <p className="text-pretty text-sm font-semibold leading-normal text-white/95 md:text-sm md:leading-snug">{btn}</p>
                  ) : null}
                  {hasLink ? (
                    <span className="pointer-events-auto mt-0.5 self-start">
                      <BannerCta href={String(banner.action_path).trim()} label={btn || "Ko'rish"} />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {serviceCards.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold sm:text-xl">Kategoriyalar</h2>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {serviceCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setSearchQuery(card.title)}
                className="group w-[96px] shrink-0 snap-start text-left"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 transition group-hover:border-zinc-300">
                  {card.image_url ? (
                    <Image src={card.image_url} alt={card.title} fill sizes="96px" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <Store className="h-6 w-6" aria-hidden />
                    </div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-center text-xs font-medium leading-tight text-zinc-700 group-hover:text-zinc-900">{card.title}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold sm:text-xl">Yaqin do&apos;konlar</h2>
          <Link href="/search" className="shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700">
            Hammasi
          </Link>
        </div>
        {storeCarouselItems.length > 0 ? (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {storeCarouselItems.map((card) => {
              const inner = (
                <div className="relative h-[74px] w-[108px] shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-200/90 bg-white">
                  {card.image_url ? (
                    <Image
                      src={card.image_url}
                      alt={card.title ?? "Do'kon"}
                      fill
                      sizes="108px"
                      className="h-full w-full object-cover"
                      loading="lazy"
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
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Tez orada yangi do&apos;konlar qo&apos;shiladi
          </p>
        )}
      </section>

      {deals.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold sm:text-xl">Chegirmalar va bonuslar</h2>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {deals.map((deal) => {
              const oldCents = deal.price_cents;
              const newCents = deal.deal_price_cents ?? oldCents;
              return (
                <Link
                  href={`/home/restaurant/${deal.restaurant_id}`}
                  key={deal.id}
                  className="w-[148px] shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-200 bg-white sm:w-[156px]"
                >
                  <div className="relative h-[72px] bg-zinc-100">
                    {deal.image_url ? (
                      <Image src={deal.image_url} alt={deal.name} fill sizes="156px" className="h-full w-full object-cover" loading="lazy" />
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
              deliveryFeeCents={restaurant.delivery_fee_cents}
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
