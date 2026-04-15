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
const supabase = createSupabaseBrowserClient();

export default function RestaurantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Boshqa");
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const ensureFallbackCategory = useCallback(async (rid: string) => {
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("restaurant_id", rid)
      .eq("name", "Boshqa")
      .maybeSingle();
    if (!existing) {
      await supabase.from("menu_categories").insert({
        restaurant_id: rid,
        name: "Boshqa",
        sort_order: 0,
      });
    }
  }, []);

  const loadProducts = useCallback(async (rid: string) => {
    const { data: rows } = await supabase
      .from("menu_items")
      .select("id,name,category,price_cents,image_url")
      .eq("restaurant_id", rid)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    setProducts((rows ?? []) as Product[]);
  }, []);

  const loadCategories = useCallback(async (rid: string) => {
    const { data: rows } = await supabase
      .from("menu_categories")
      .select("id,name,sort_order")
      .eq("restaurant_id", rid)
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

      await ensureFallbackCategory(restaurant.id);
      await Promise.all([loadProducts(restaurant.id), loadCategories(restaurant.id)]);
    };
    void loadData();
  }, [ensureFallbackCategory, loadCategories, loadProducts]);

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
    setCategory("Boshqa");
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
    setCategory("Boshqa");
    setPrice("0");
    setImageUrl("");
    await loadProducts(restaurantId);
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Mahsulot o'chirildi");
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const onAddCategory = async () => {
    if (!restaurantId) return;
    const value = newCategory.trim();
    if (!value) return;
    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name: value,
      sort_order: categories.length + 1,
    });
    if (error) return toast.error(error.message);
    toast.success("Kategoriya qo'shildi");
    setNewCategory("");
    await loadCategories(restaurantId);
  };

  const onDeleteCategory = async (cat: MenuCategory) => {
    if (!restaurantId) return;
    if (cat.name === "Boshqa") {
      toast.error("Boshqa kategoriyasini o'chirib bo'lmaydi");
      return;
    }
    // Keep menu consistent: move items to fallback before deleting category.
    const { error: moveError } = await supabase
      .from("menu_items")
      .update({ category: "Boshqa" })
      .eq("restaurant_id", restaurantId)
      .eq("category", cat.name);
    if (moveError) return toast.error(moveError.message);

    const { error } = await supabase.from("menu_categories").delete().eq("id", cat.id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Kategoriya o'chirildi");
    await Promise.all([loadProducts(restaurantId), loadCategories(restaurantId)]);
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Mahsulotlar</h1>
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Kategoriyalar</h2>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1.5 text-xs">
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => void onDeleteCategory(cat)}
                className="text-zinc-400 transition hover:text-red-600"
                aria-label={`Delete category ${cat.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Yangi kategoriya nomi"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void onAddCategory()} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Kategoriya qo&apos;shish
          </button>
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
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">{editingId ? "Saqlash" : "Qo&apos;shish"}</button>
        {editingId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2"
            onClick={() => {
              setEditingId(null);
              setName("");
              setCategory("Boshqa");
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
            <p className="text-sm text-zinc-600">so&apos;m {(Number(product.price_cents) / 100).toFixed(0)}</p>
            {product.image_url ? <p className="truncate text-xs text-zinc-500">{product.image_url}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onEdit(product)}>
                Tahrirlash
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(product.id)}>
                O&apos;chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
