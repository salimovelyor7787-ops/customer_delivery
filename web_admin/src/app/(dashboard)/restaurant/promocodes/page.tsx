"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Promo = {
  id: string;
  code: string;
  discount: number | null;
  discount_fixed_cents: number | null;
  audience: string;
  min_subtotal_cents: number;
  expires_at: string | null;
  listed_for_customers: boolean;
  active: boolean;
};

export default function RestaurantPromocodesPage() {
  const supabase = createSupabaseBrowserClient();
  const [restaurantId, setRestaurantId] = useState("");
  const [items, setItems] = useState<Promo[]>([]);

  const [code, setCode] = useState("");
  const [discountKind, setDiscountKind] = useState<"percent" | "fixed">("percent");
  const [percentVal, setPercentVal] = useState("10");
  const [fixedSom, setFixedSom] = useState("5000");
  const [expiresLocal, setExpiresLocal] = useState("");
  const [audience, setAudience] = useState<"all" | "first_order">("all");
  const [minSubtotalSom, setMinSubtotalSom] = useState("0");
  const [listed, setListed] = useState(true);

  const loadList = useCallback(
    async (rid: string) => {
      const { data, error } = await supabase.from("promocodes").select("*").eq("restaurant_id", rid).order("created_at", { ascending: false });
      if (error) return toast.error(error.message);
      setItems((data ?? []) as Promo[]);
    },
    [supabase],
  );

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      const rid = restaurant.id as string;
      setRestaurantId(rid);
      await loadList(rid);
    };
    void run();
  }, [loadList, supabase]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return toast.error("Restoran topilmadi");
    const minCents = Math.max(0, Math.round(Number(minSubtotalSom || "0") * 100));
    const expiresIso =
      expiresLocal.trim() === "" ? null : (() => {
        const d = new Date(expiresLocal);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      })();

    const base = {
      code: code.trim().toUpperCase(),
      active: true,
      restaurant_id: restaurantId,
      audience,
      min_subtotal_cents: minCents,
      expires_at: expiresIso,
      listed_for_customers: listed,
    };

    const payload =
      discountKind === "percent"
        ? {
            ...base,
            discount: Math.min(100, Math.max(1, Math.round(Number(percentVal || "0")))),
            discount_fixed_cents: null,
          }
        : {
            ...base,
            discount: null,
            discount_fixed_cents: Math.max(1, Math.round(Number(fixedSom || "0") * 100)),
          };

    const { error } = await supabase.from("promocodes").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Promokod yaratildi");
    setCode("");
    setPercentVal("10");
    setFixedSom("5000");
    setExpiresLocal("");
    setMinSubtotalSom("0");
    await loadList(restaurantId);
  };

  const onToggle = async (promo: Promo) => {
    const { error } = await supabase.from("promocodes").update({ active: !promo.active }).eq("id", promo.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((row) => (row.id === promo.id ? { ...row, active: !row.active } : row)));
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("promocodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((row) => row.id !== id));
    toast.success("Promokod o'chirildi");
  };

  const labelDiscount = (p: Promo) => {
    if (p.discount_fixed_cents != null && p.discount_fixed_cents > 0) {
      return `${(p.discount_fixed_cents / 100).toFixed(0)} so'm`;
    }
    return `${p.discount ?? 0}%`;
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Promokodlar</h1>
      <p className="text-sm text-zinc-600">
        Kod butun tizimda noyob bo'lishi kerak. Tugash vaqti, minimal summa va auditoriyani sozlang.
      </p>

      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-600">Kod</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MASALAN VIP2026"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 uppercase"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-600">Chegirma turi</span>
          <select
            value={discountKind}
            onChange={(e) => setDiscountKind(e.target.value as "percent" | "fixed")}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="percent">Foiz (%)</option>
            <option value="fixed">So'm (qattiq summa)</option>
          </select>
        </label>
        {discountKind === "percent" ? (
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-600">Foiz (1–100)</span>
            <input
              value={percentVal}
              onChange={(e) => setPercentVal(e.target.value)}
              type="number"
              min={1}
              max={100}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        ) : (
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-600">So'm chegirma</span>
            <input
              value={fixedSom}
              onChange={(e) => setFixedSom(e.target.value)}
              type="number"
              min={1}
              step="1"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-600">Tugash vaqti (ixtiyoriy)</span>
          <input
            type="datetime-local"
            value={expiresLocal}
            onChange={(e) => setExpiresLocal(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-600">Auditoriya</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as "all" | "first_order")}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="all">Barcha mijozlar</option>
            <option value="first_order">Faqat birinchi buyurtma (akkaunt bilan)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-600">Minimal mahsulot summasi (so'm)</span>
          <input
            value={minSubtotalSom}
            onChange={(e) => setMinSubtotalSom(e.target.value)}
            type="number"
            min={0}
            step="1"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} />
          <span>Mijozlar ilovasida ro'yxatda ko'rsatish</span>
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-white">
            Qo'shish
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[760px] text-sm md:min-w-full">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Chegirma</th>
              <th className="px-4 py-3">Min. summa</th>
              <th className="px-4 py-3">Tugash</th>
              <th className="px-4 py-3">Auditoriya</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((promo) => (
              <tr key={promo.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{promo.code}</td>
                <td className="px-4 py-3">{labelDiscount(promo)}</td>
                <td className="px-4 py-3">{(promo.min_subtotal_cents / 100).toFixed(0)} so'm</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {promo.expires_at ? new Date(promo.expires_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">{promo.audience === "first_order" ? "1-buyurtma" : "Barcha"}</td>
                <td className="px-4 py-3">{promo.active ? "Faol" : "O'chirilgan"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onToggle(promo)}>
                      Almashirish
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      onClick={() => onDelete(promo.id)}
                    >
                      O'chirish
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
