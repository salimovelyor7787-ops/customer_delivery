"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price_cents: number;
  image_url: string | null;
};
type MenuCategory = { id: string; name: string; sort_order: number };
type MenuOption = { id: string; menu_item_id: string; name: string; price_delta_cents: number; sort_order: number };
const supabase = createSupabaseBrowserClient();

export default function RestaurantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Boshqa");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOptionItemId, setSelectedOptionItemId] = useState<string>("");
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("0");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const getDefaultCategory = () =>
    categories.find((item) => item.name === "Boshqa")?.name ?? categories[0]?.name ?? "Boshqa";

  const loadProducts = useCallback(async (rid: string) => {
    const { data: rows } = await supabase
      .from("menu_items")
      .select("id,name,category,price_cents,image_url")
      .eq("restaurant_id", rid)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    setProducts((rows ?? []) as Product[]);
  }, []);

  const loadOptions = useCallback(async (menuItemId: string) => {
    if (!menuItemId) {
      setOptions([]);
      return;
    }
    const { data, error } = await supabase
      .from("menu_item_options")
      .select("id,menu_item_id,name,price_delta_cents,sort_order")
      .eq("menu_item_id", menuItemId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return toast.error(error.message);
    setOptions((data ?? []) as MenuOption[]);
  }, []);

  const loadCategories = useCallback(async (rid: string) => {
    const { data: rows } = await supabase
      .from("categories")
      .select("id,name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    const list = (rows ?? []) as MenuCategory[];
    setCategories(list);
    setCategory((prev) => (list.some((c) => c.name === prev) ? prev : list.find((c) => c.name === "Boshqa")?.name ?? list[0]?.name ?? "Boshqa"));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      await Promise.all([loadProducts(restaurant.id), loadCategories(restaurant.id)]);
    };
    void loadData();
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    if (!selectedOptionItemId) return;
    const timer = setTimeout(() => {
      void loadOptions(selectedOptionItemId);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedOptionItemId, loadOptions]);

  useEffect(() => {
    setCategory((prev) => (categories.some((item) => item.name === prev) ? prev : getDefaultCategory()));
  }, [categories]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      name,
      category: category.trim() || "Boshqa",
      price_cents: Math.round(Number(price) * 100),
      image_url: imageUrl || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Mahsulot yaratildi");
    setName("");
    setCategory(getDefaultCategory());
    setPrice("0");
    setImageUrl("");
    await loadProducts(restaurantId);
  };

  const onEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category ?? "Boshqa");
    setPrice((Number(product.price_cents) / 100).toFixed(2));
    setImageUrl(product.image_url ?? "");
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const { error } = await supabase
      .from("menu_items")
      .update({
        name,
        category: category.trim() || "Boshqa",
        price_cents: Math.round(Number(price) * 100),
        image_url: imageUrl || null,
      })
      .eq("id", editingId)
      .eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Mahsulot yangilandi");
    setEditingId(null);
    setName("");
    setCategory(getDefaultCategory());
    setPrice("0");
    setImageUrl("");
    await loadProducts(restaurantId);
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Mahsulot o'chirildi");
    setProducts((prev) => prev.filter((item) => item.id !== id));
    if (selectedOptionItemId === id) {
      setSelectedOptionItemId("");
      setOptions([]);
    }
  };

  const onCreateOption = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOptionItemId) {
      toast.error("Avval mahsulotni tanlang");
      return;
    }
    const cleanName = optionName.trim();
    if (!cleanName) return;
    const { error } = await supabase.from("menu_item_options").insert({
      menu_item_id: selectedOptionItemId,
      name: cleanName,
      price_delta_cents: Math.round(Number(optionPrice) * 100),
      sort_order: options.length,
    });
    if (error) return toast.error(error.message);
    toast.success("Qo'shimcha qo'shildi");
    setOptionName("");
    setOptionPrice("0");
    setEditingOptionId(null);
    await loadOptions(selectedOptionItemId);
  };

  const onDeleteOption = async (id: string) => {
    const { error } = await supabase.from("menu_item_options").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOptions((prev) => prev.filter((o) => o.id !== id));
    toast.success("Qo'shimcha o'chirildi");
  };

  const onEditOption = (opt: MenuOption) => {
    setEditingOptionId(opt.id);
    setOptionName(opt.name);
    setOptionPrice((opt.price_delta_cents / 100).toFixed(2));
  };

  const onSaveOption = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingOptionId) return;
    const cleanName = optionName.trim();
    if (!cleanName) return;
    const { error } = await supabase
      .from("menu_item_options")
      .update({
        name: cleanName,
        price_delta_cents: Math.round(Number(optionPrice) * 100),
      })
      .eq("id", editingOptionId);
    if (error) return toast.error(error.message);
    toast.success("Qo'shimcha yangilandi");
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
    await loadOptions(selectedOptionItemId);
  };

  const onCancelOptionEdit = () => {
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
  };

  const onMoveOption = async (id: string, direction: "up" | "down") => {
    const index = options.findIndex((opt) => opt.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const next = [...options];
    const tmp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = tmp;

    const normalized = next.map((opt, idx) => ({ ...opt, sort_order: idx }));
    setOptions(normalized);

    const updates = normalized.map((opt) =>
      supabase.from("menu_item_options").update({ sort_order: opt.sort_order }).eq("id", opt.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      await loadOptions(selectedOptionItemId);
      return;
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Mahsulotlar</h1>
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Kategoriyalar</h2>
        <div className="flex flex-wrap items-center gap-2">
          {categories.length === 0 ? <p className="text-sm text-zinc-500">Kategoriya hali yo'q. Avval admin paneldagi Kategoriyalar bo'limida qo'shing.</p> : null}
          {categories.map((cat) => (
            <div key={cat.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1.5 text-xs">
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={editingId ? onSave : onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nomi" className="rounded-lg border border-zinc-300 px-3 py-2" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2">
          {categories.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Narx"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Rasm URL yoki fayl"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          <ImageUpload folder="products" onUploaded={setImageUrl} className="self-start" />
        </div>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">{editingId ? "Saqlash" : "Qo'shish"}</button>
        {editingId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2"
            onClick={() => {
              setEditingId(null);
              setName("");
              setCategory(getDefaultCategory());
              setPrice("0");
              setImageUrl("");
            }}
          >
            Bekor qilish
          </button>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-zinc-500">{product.category ?? "Boshqa"}</p>
            <p className="text-sm text-zinc-600">so'm {(Number(product.price_cents) / 100).toFixed(0)}</p>
            {product.image_url ? (
              <div className="relative mt-2 h-28 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                {/* Admin preview: arbitrary storage URLs; next/image would need per-project remotePatterns */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="mt-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
                Rasm yo'q
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onEdit(product)}>
                Tahrirlash
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(product.id)}>
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Qo'shimchalar (соус, имбирь, ...)</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
          <select
            value={selectedOptionItemId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedOptionItemId(nextId);
              if (!nextId) setOptions([]);
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Mahsulotni tanlang</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <form onSubmit={editingOptionId ? onSaveOption : onCreateOption} className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
            <input
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              placeholder="Masalan: Soeviy sous"
              className="rounded-lg border border-zinc-300 px-3 py-2"
              required
            />
            <input
              value={optionPrice}
              onChange={(e) => setOptionPrice(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Narx"
              className="rounded-lg border border-zinc-300 px-3 py-2"
              required
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">
              {editingOptionId ? "Saqlash" : "Qo'shish"}
            </button>
            {editingOptionId ? (
              <button type="button" onClick={onCancelOptionEdit} className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-700">
                Bekor qilish
              </button>
            ) : null}
          </form>
        </div>

        {selectedOptionItemId ? (
          options.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-[680px] text-sm md:min-w-full">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Nomi</th>
                    <th className="px-3 py-2">Narx</th>
                    <th className="px-3 py-2">Tartib</th>
                    <th className="px-3 py-2">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt, idx) => (
                    <tr key={opt.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">{opt.name}</td>
                      <td className="px-3 py-2">so'm {(opt.price_delta_cents / 100).toFixed(0)}</td>
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            onClick={() => void onMoveOption(opt.id, "up")}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            onClick={() => void onMoveOption(opt.id, "down")}
                            disabled={idx === options.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            onClick={() => onEditOption(opt)}
                          >
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                            onClick={() => void onDeleteOption(opt.id)}
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
          ) : (
            <p className="text-sm text-zinc-500">Bu mahsulot uchun qo'shimcha hali qo'shilmagan.</p>
          )
        ) : (
          <p className="text-sm text-zinc-500">Qo'shimchalarni boshqarish uchun avval mahsulotni tanlang.</p>
        )}
      </div>
    </section>
  );
}
