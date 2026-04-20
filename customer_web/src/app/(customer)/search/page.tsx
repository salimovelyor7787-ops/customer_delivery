"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const popular = ["Burger", "Pizza", "Sushi", "Coffee", "Lavash"];

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
      <section className="space-y-4 sm:space-y-5">
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Bu sahifada restoran kartochkalari ko&apos;rsatilmaydi.
        </p>
      </section>
    </main>
  );
}
