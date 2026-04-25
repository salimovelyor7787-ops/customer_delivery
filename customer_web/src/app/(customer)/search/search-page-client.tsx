"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Restaurant = {
  id: string;
  name: string;
  image_url: string | null;
  is_open: boolean;
  category_id: string | null;
  category_ids: string[] | null;
};

type ServiceCard = {
  id: string;
  key: string;
  title: string;
  image_url: string | null;
  banner_image_url: string | null;
};

export type SearchPageInitialPayload = {
  restaurants: Restaurant[];
  categories: Record<string, string>;
  serviceCards: ServiceCard[];
};

type Props = {
  initial: SearchPageInitialPayload;
};

export function SearchPageClient({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  const applyQuery = (value: string) => {
    const next = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set("q", next);
    } else {
      params.delete("q");
    }
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
    setQuery(value);
  };

  const filteredRestaurants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return initial.restaurants.filter((restaurant) => {
      if (restaurant.name.toLowerCase().includes(needle)) return true;
      const ids =
        restaurant.category_ids && restaurant.category_ids.length > 0
          ? restaurant.category_ids
          : restaurant.category_id
            ? [restaurant.category_id]
            : [];
      const categoryText = ids
        .map((id) => initial.categories[id] ?? "")
        .join(" ")
        .toLowerCase();
      return categoryText.includes(needle);
    });
  }, [initial.categories, initial.restaurants, query]);

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Kategoriyalar</h1>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Restoran qidiring..."
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 sm:py-3 sm:text-base"
          autoComplete="off"
        />
      </label>

      <section className="space-y-3">
        {initial.serviceCards.map((card) => {
          const imageUrl = card.banner_image_url || card.image_url;
          const targetHref = `/search?q=${encodeURIComponent(card.title)}`;
          return (
            <article key={card.id} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={card.title}
                  width={1200}
                  height={600}
                  className="h-[138px] w-full object-cover sm:h-[156px]"
                />
              ) : (
                <div className="h-[138px] w-full bg-zinc-200 sm:h-[156px]" />
              )}
              <div className="absolute inset-0 flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="max-w-[62%] space-y-2">
                  <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">{card.title}</h2>
                  <p className="line-clamp-1 text-sm text-zinc-700 sm:text-base">Kategoriya bo&apos;yicha restoranlarni ko&apos;rish</p>
                  <button
                    type="button"
                    onClick={() => applyQuery(card.title)}
                    className="rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98]"
                  >
                    Ko&apos;rish
                  </button>
                </div>
                <Link href={targetHref} className="sr-only" aria-label={`${card.title} sahifasiga o'tish`}>
                  {card.title}
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="space-y-2">
        {query.trim().length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Kategoriya kartochkasidan birini tanlang yoki qidiruv yozing.
          </p>
        ) : filteredRestaurants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Mos restoran topilmadi.
          </p>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/home/restaurant/${restaurant.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-300"
            >
              {restaurant.name}
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
