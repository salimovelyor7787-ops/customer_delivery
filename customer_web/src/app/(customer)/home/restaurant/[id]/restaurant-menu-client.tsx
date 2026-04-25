"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
};

export type Restaurant = { id: string; name: string; image_url: string | null };

function MenuItemRow({ item }: { item: MenuItem }) {
  const { items, addItemWithRestaurantGuard, setQuantity } = useCart();
  const qty = items.find((line) => line.id === item.id)?.quantity ?? 0;

  const addOne = () => {
    const { switched } = addItemWithRestaurantGuard({
      id: item.id,
      name: item.name,
      priceCents: item.price_cents,
      imageUrl: item.image_url,
      restaurantId: item.restaurant_id,
    });
    if (switched) toast("Savat boshqa restoranga almashtirildi");
  };

  return (
    <article className="flex min-h-[6.5rem] gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} width={80} height={80} className="h-full w-full object-cover" sizes="80px" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col pr-1">
        <p className="font-medium">{item.name}</p>
        {item.description ? <p className="line-clamp-2 text-sm text-zinc-500">{item.description}</p> : null}
        <Link href={`/home/restaurant/${item.restaurant_id}/item/${item.id}`} className="mt-auto pt-2 text-xs text-orange-600">
          Batafsil
        </Link>
      </div>
      <div className="flex w-[4.5rem] shrink-0 flex-col items-end justify-end gap-1 self-stretch pl-1">
        <p className="text-right text-sm font-semibold tabular-nums text-zinc-900">{(item.price_cents / 100).toFixed(0)} so&apos;m</p>
        <div className="flex h-9 min-h-9 items-center justify-end">
          {item.is_available ? (
            qty === 0 ? (
              <button
                type="button"
                onClick={addOne}
                aria-label="Savatga qo&apos;shish"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 active:scale-95"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="inline-flex h-9 max-h-9 items-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50">
                <button
                  type="button"
                  aria-label="Kamaytirish"
                  onClick={() => setQuantity(item.id, qty - 1)}
                  className="px-2.5 py-1.5 text-base font-medium leading-none text-zinc-700 hover:bg-zinc-100"
                >
                  −
                </button>
                <span className="min-w-[1.75rem] select-none px-0.5 text-center text-xs font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Ko&apos;paytirish"
                  onClick={() => setQuantity(item.id, qty + 1)}
                  className="px-2.5 py-1.5 text-base font-medium leading-none text-zinc-700 hover:bg-zinc-100"
                >
                  +
                </button>
              </div>
            )
          ) : (
            <p className="max-w-[4.5rem] text-right text-[10px] leading-tight text-zinc-400">Mavjud emas</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function RestaurantMenuClient({ restaurant, items }: { restaurant: Restaurant | null; items: MenuItem[] }) {
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
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-zinc-200 sm:h-52 lg:h-64 lg:max-h-[22rem]">
        {restaurant?.image_url ? (
          <Image
            src={restaurant.image_url}
            alt={restaurant.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
            className="object-cover"
            priority
            fetchPriority="high"
            decoding="sync"
          />
        ) : null}
      </div>
      <h1 className="text-2xl font-semibold sm:text-3xl">{restaurant?.name ?? "Restoran"}</h1>
      <div className="space-y-5 lg:space-y-8">
        {grouped.map(([category, lines]) => (
          <section key={category} className="space-y-2">
            <h2 className="px-1 text-lg font-semibold sm:text-xl">{category}</h2>
            <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
              {lines.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
