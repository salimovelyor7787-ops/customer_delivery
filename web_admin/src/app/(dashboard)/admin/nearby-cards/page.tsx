"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type NearbyCard = {
  id: string;
  title: string | null;
  image_url: string;
  restaurant_id: string | null;
  sort_order: number;
  is_active: boolean;
};

type RestaurantOption = {
  id: string;
  name: string;
};

const supabase = createSupabaseBrowserClient();

export default function AdminNearbyCardsPage() {
  const [rows, setRows] = useState<NearbyCard[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const loadRows = async () => {
    const { data, error } = await supabase
      .from("home_nearby_cards")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as NearbyCard[]);
  };

  const loadRestaurants = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,name")
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRestaurants((data ?? []) as RestaurantOption[]);
  };

  useEffect(() => {
    void loadRows();
    void loadRestaurants();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setImageUrl("");
    setRestaurantId("");
    setSortOrder(0);
    setIsActive(true);
  };

  const startEdit = (row: NearbyCard) => {
    setEditingId(row.id);
    setTitle(row.title ?? "");
    setImageUrl(row.image_url);
    setRestaurantId(row.restaurant_id ?? "");
    setSortOrder(row.sort_order);
    setIsActive(row.is_active);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      title: title.trim() || null,
      image_url: imageUrl.trim(),
      restaurant_id: restaurantId || null,
      sort_order: sortOrder,
      is_active: isActive,
    };

    const query = editingId
      ? supabase.from("home_nearby_cards").update(payload).eq("id", editingId)
      : supabase.from("home_nearby_cards").insert(payload);

    const { error } = await query;
    if (error) return toast.error(error.message);

    toast.success(editingId ? "Kartochka yangilandi" : "Kartochka yaratildi");
    resetForm();
    await loadRows();
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("home_nearby_cards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kartochka o'chirildi");
    await loadRows();
  };

  const onToggle = async (row: NearbyCard) => {
    const { error } = await supabase
      .from("home_nearby_cards")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) =>
      prev.map((current) =>
        current.id === row.id ? { ...current, is_active: !row.is_active } : current,
      ),
    );
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Yaqin kartochkalar</h1>
      <p className="text-sm text-zinc-500">
        Bosh sahifadagi &quot;Yaqin do&apos;konlar&quot; bloki uchun rasm kartochkalarini boshqaring.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ichki nom (ixtiyoriy)"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="flex flex-col gap-2 md:col-span-2">
          <p className="text-xs text-zinc-500">Rasm: URL yoki fayl (majburiy)</p>
          <div className="flex flex-wrap items-stretch gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Rasm URL"
              required
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2"
            />
            <ImageUpload folder="home-nearby-cards" onUploaded={setImageUrl} />
          </div>
        </div>
        <select
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="">Restoranga bog&apos;lamaslik</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          placeholder="Tartib raqami"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Faol
        </label>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">
          {editingId ? "Yangilash" : "Yaratish"}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-zinc-300 px-4 py-2"
          >
            Bekor qilish
          </button>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{row.title || "Nomsiz"}</p>
            <p className="truncate text-xs text-zinc-500">{row.image_url}</p>
            <p className="mt-1 text-xs text-zinc-500">Restoran: {row.restaurant_id || "yo'q"}</p>
            <p className="mt-1 text-xs text-zinc-500">Tartib: {row.sort_order}</p>
            <p className="mt-1 text-xs text-zinc-600">
              Holat: {row.is_active ? "faol" : "o'chirilgan"}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                onClick={() => startEdit(row)}
              >
                Tahrirlash
              </button>
              <button
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                onClick={() => onToggle(row)}
              >
                Almashirish
              </button>
              <button
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                onClick={() => onDelete(row.id)}
              >
                {"O'chirish"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
