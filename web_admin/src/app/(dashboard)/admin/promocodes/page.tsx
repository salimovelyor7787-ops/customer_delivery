"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Promocode = { id: string; code: string; discount: number; active: boolean };
const supabase = createSupabaseBrowserClient();

export default function AdminPromocodesPage() {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [items, setItems] = useState<Promocode[]>([]);
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.from("promocodes").select("*").order("code");
      setItems((data ?? []) as Promocode[]);
    };
    void loadData();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("promocodes").insert({
      code: code.toUpperCase(),
      discount: Number(discount),
      active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Promocode created");
    setCode("");
    setDiscount("10");
    const { data } = await supabase.from("promocodes").select("*").order("code");
    setItems((data ?? []) as Promocode[]);
  };

  const onToggle = async (promo: Promocode) => {
    const { error } = await supabase.from("promocodes").update({ active: !promo.active }).eq("id", promo.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((row) => (row.id === promo.id ? { ...row, active: !row.active } : row)));
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("promocodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((row) => row.id !== id));
    toast.success("Promocode deleted");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Promocodes</h1>
      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          type="number"
          min="1"
          max="100"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">Add promo</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((promo) => (
              <tr key={promo.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{promo.code}</td>
                <td className="px-4 py-3">{promo.discount}%</td>
                <td className="px-4 py-3">{promo.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onToggle(promo)}>
                      Toggle
                    </button>
                    <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(promo.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
