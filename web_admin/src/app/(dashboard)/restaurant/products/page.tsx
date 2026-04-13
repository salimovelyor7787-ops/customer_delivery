"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Product = { id: string; name: string; price_cents: number; image_url: string | null };
const supabase = createSupabaseBrowserClient();

export default function RestaurantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      const { data: rows } = await supabase.from("menu_items").select("id,name,price_cents,image_url").eq("restaurant_id", restaurant.id);
      setProducts((rows ?? []) as Product[]);
    };
    void loadData();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      name,
      price_cents: Math.round(Number(price) * 100),
      image_url: imageUrl || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Product created");
    setName("");
    setPrice("0");
    setImageUrl("");
    const { data: rows } = await supabase.from("menu_items").select("id,name,price_cents,image_url").eq("restaurant_id", restaurantId);
    setProducts((rows ?? []) as Product[]);
  };

  const onEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
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
        price_cents: Math.round(Number(price) * 100),
        image_url: imageUrl || null,
      })
      .eq("id", editingId)
      .eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Product updated");
    setEditingId(null);
    setName("");
    setPrice("0");
    setImageUrl("");
    const { data: rows } = await supabase.from("menu_items").select("id,name,price_cents,image_url").eq("restaurant_id", restaurantId);
    setProducts((rows ?? []) as Product[]);
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", restaurantId);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Products</h1>
      <form onSubmit={editingId ? onSave : onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" className="rounded-lg border border-zinc-300 px-3 py-2" />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">{editingId ? "Save changes" : "Add product"}</button>
        {editingId ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2"
            onClick={() => {
              setEditingId(null);
              setName("");
              setPrice("0");
              setImageUrl("");
            }}
          >
            Cancel
          </button>
        ) : null}
        <ImageUpload onUploaded={setImageUrl} />
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-zinc-600">${(Number(product.price_cents) / 100).toFixed(2)}</p>
            {product.image_url ? <p className="truncate text-xs text-zinc-500">{product.image_url}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onEdit(product)}>
                Edit
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(product.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
