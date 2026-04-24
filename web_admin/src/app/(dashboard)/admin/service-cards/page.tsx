"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ServiceCard = {
  id: string;
  service_key: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

const supabase = createSupabaseBrowserClient();

export default function AdminServiceCardsPage() {
  const [rows, setRows] = useState<ServiceCard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceKey, setServiceKey] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const loadRows = async () => {
    const { data, error } = await supabase
      .from("home_service_cards")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as ServiceCard[]);
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setServiceKey("");
    setTitle("");
    setImageUrl("");
    setSortOrder(0);
    setIsActive(true);
  };

  const slugify = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const key = slugify(serviceKey || cleanTitle);
    if (!cleanTitle) {
      toast.error("Kategoriya nomini kiriting");
      return;
    }
    if (!key) {
      toast.error("Slug noto'g'ri");
      return;
    }
    if (!imageUrl.trim()) {
      toast.error("Rasm kiriting");
      return;
    }
    const payload = {
      service_key: key,
      title: cleanTitle,
      image_url: imageUrl.trim(),
      sort_order: sortOrder,
      is_active: isActive,
    };
    const query =
      editingId == null
        ? supabase.from("home_service_cards").insert(payload)
        : supabase.from("home_service_cards").update(payload).eq("id", editingId);

    const { error } = await query;
    if (error) return toast.error(error.message);

    toast.success(editingId == null ? "Kartochka yaratildi" : "Kartochka yangilandi");
    resetForm();
    await loadRows();
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("home_service_cards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kartochka o'chirildi");
    await loadRows();
  };

  const onToggle = async (row: ServiceCard) => {
    const { error } = await supabase
      .from("home_service_cards")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) =>
      prev.map((current) =>
        current.id === row.id ? { ...current, is_active: !row.is_active } : current,
      ),
    );
  };

  const onEdit = (row: ServiceCard) => {
    setEditingId(row.id);
    setServiceKey(row.service_key);
    setTitle(row.title);
    setImageUrl(row.image_url);
    setSortOrder(row.sort_order);
    setIsActive(row.is_active);
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Xizmat kartochkalari</h1>
      <p className="text-sm text-zinc-500">
        Bosh sahifadagi umumiy kategoriya kartochkalarini sozlang (masalan: restoranlar, gullar, mahsulotlar).
      </p>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-6"
      >
        <input
          value={serviceKey}
          onChange={(e) => setServiceKey(e.target.value)}
          placeholder="Slug (ixtiyoriy): flowers-shop"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kategoriya nomi"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Rasm URL yoki fayl yuklang"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          <ImageUpload folder="home-service-cards" onUploaded={setImageUrl} className="self-start" />
        </div>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          placeholder="Tartib"
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
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">{editingId == null ? "Qo'shish" : "Saqlash"}</button>
        {editingId ? (
          <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-300 px-4 py-2">
            Bekor qilish
          </button>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">
              {row.title} <span className="text-xs text-zinc-500">({row.service_key})</span>
            </p>
            <p className="truncate text-xs text-zinc-500">{row.image_url}</p>
            <p className="mt-1 text-xs text-zinc-500">Tartib: {row.sort_order}</p>
            <p className="mt-1 text-xs text-zinc-600">
              Holat: {row.is_active ? "faol" : "o'chirilgan"}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                onClick={() => onEdit(row)}
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
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
