"use client";

import Link from "next/link";
import { useCart } from "@/components/customer/cart-context";

export default function CartPage() {
  const { items, setQuantity, totalCents, removeItem } = useCart();

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Savat</h1>
      {items.length === 0 ? <p className="text-sm text-zinc-500">Savat bo&apos;sh</p> : null}
      <div className="lg:grid lg:grid-cols-[1fr_min(22rem,100%)] lg:items-start lg:gap-8">
        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 font-medium">{item.name}</p>
                <button type="button" onClick={() => removeItem(item.id)} className="shrink-0 text-sm text-red-600">O&apos;chirish</button>
              </div>
              <p className="text-sm text-zinc-500">{(item.priceCents / 100).toFixed(0)} so&apos;m</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="rounded border border-zinc-300 px-2">-</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="rounded border border-zinc-300 px-2">+</button>
              </div>
            </article>
          ))}
        </div>
        {items.length > 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-4 lg:mt-0">
            <p className="mb-3 text-lg font-semibold">Jami: {(totalCents / 100).toFixed(0)} so&apos;m</p>
            <Link href="/checkout" className="inline-flex w-full justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-white sm:w-auto">Buyurtma berish</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
