"use client";

import Link from "next/link";
import { useCart } from "@/components/customer/cart-context";

export default function CartPage() {
  const { items, setQuantity, totalCents, removeItem } = useCart();

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Savat</h1>
      {items.length === 0 ? <p className="text-sm text-zinc-500">Savat bo&apos;sh</p> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name}</p>
              <button type="button" onClick={() => removeItem(item.id)} className="text-sm text-red-600">O&apos;chirish</button>
            </div>
            <p className="text-sm text-zinc-500">so&apos;m {(item.priceCents / 100).toFixed(0)}</p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="rounded border border-zinc-300 px-2">-</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="rounded border border-zinc-300 px-2">+</button>
            </div>
          </article>
        ))}
      </div>
      {items.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-lg font-semibold">Jami: so&apos;m {(totalCents / 100).toFixed(0)}</p>
          <Link href="/checkout" className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-white">Buyurtma berish</Link>
        </div>
      ) : null}
    </main>
  );
}
