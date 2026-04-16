"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Option = { id: string; name: string; price_delta_cents: number };
type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  is_available: boolean;
  menu_item_options: Option[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string; itemId: string }>();
  const supabase = createSupabaseBrowserClient();
  const { addItemWithRestaurantGuard } = useCart();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("menu_items").select("id,restaurant_id,name,description,image_url,price_cents,is_available,menu_item_options(id,name,price_delta_cents)").eq("restaurant_id", params.id).eq("id", params.itemId).single().then(({ data }) => setItem((data as MenuItem) ?? null));
  }, [params.id, params.itemId, supabase]);

  const totalCents = useMemo(() => {
    if (!item) return 0;
    const add = item.menu_item_options.filter((option) => selectedOptions.includes(option.id)).reduce((sum, option) => sum + option.price_delta_cents, 0);
    return item.price_cents + add;
  }, [item, selectedOptions]);

  if (!item) return <main className="p-4">Yuklanmoqda...</main>;

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">{item.name}</h1>
      {item.image_url ? <img src={item.image_url} alt={item.name} className="h-52 w-full rounded-2xl object-cover" /> : null}
      {item.description ? <p className="text-sm text-zinc-600">{item.description}</p> : null}
      {item.menu_item_options.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Qo&apos;shimchalar</h2>
          {item.menu_item_options.map((option) => (
            <label key={option.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{option.name}</span>
              <span className="text-xs text-zinc-500">+ {(option.price_delta_cents / 100).toFixed(0)} so&apos;m</span>
              <input type="checkbox" checked={selectedOptions.includes(option.id)} onChange={(e) => setSelectedOptions((prev) => (e.target.checked ? [...prev, option.id] : prev.filter((id) => id !== option.id)))} />
            </label>
          ))}
        </section>
      ) : null}
      <button
        type="button"
        disabled={!item.is_available}
        onClick={() => {
          const cartId = selectedOptions.length > 0 ? `${item.id}:${selectedOptions.sort().join(",")}` : item.id;
          const { switched } = addItemWithRestaurantGuard({ id: cartId, name: item.name, priceCents: totalCents, imageUrl: item.image_url, restaurantId: item.restaurant_id });
          if (switched) toast("Savat boshqa restoranga almashtirildi");
          toast.success("Savatga qo'shildi");
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        Savatga qo&apos;shish - {(totalCents / 100).toFixed(0)} so&apos;m
      </button>
    </main>
  );
}
