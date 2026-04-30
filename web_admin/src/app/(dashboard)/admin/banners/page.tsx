"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  button_text: string | null;
  action_path: string | null;
  sort_order: number;
  active: boolean;
};
const supabase = createSupabaseBrowserClient();

export default function AdminBannersPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [actionPath, setActionPath] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  const isEditing = useMemo(() => editingId != null, [editingId]);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setBanners((data ?? []) as Banner[]);
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setButtonText("");
    setActionPath("");
    setSortOrder(0);
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      title,
      subtitle: subtitle || null,
      image_url: imageUrl,
      button_text: buttonText || null,
      action_path: actionPath || null,
      sort_order: sortOrder,
      active: true,
    };
    const query = isEditing
      ? supabase.from("banners").update(payload).eq("id", editingId)
      : supabase.from("banners").insert(payload);
    const { error } = await query;
    if (error) return toast.error(error.message);
    toast.success(isEditing ? "Banner yangilandi" : "Banner yaratildi");
    resetForm();
    await loadBanners();
  };

  const onToggle = async (banner: Banner) => {
    const { error } = await supabase.from("banners").update({ active: !banner.active }).eq("id", banner.id);
    if (error) return toast.error(error.message);
    setBanners((prev) => prev.map((row) => (row.id === banner.id ? { ...row, active: !row.active } : row)));
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setBanners((prev) => prev.filter((row) => row.id !== id));
    toast.success("Banner o'chirildi");
  };

  const onEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle ?? "");
    setImageUrl(banner.image_url);
    setButtonText(banner.button_text ?? "");
    setActionPath(banner.action_path ?? "");
    setSortOrder(banner.sort_order ?? 0);
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Bannerlar</h1>
      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sarlavha (ixtiyoriy)"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Pastki matn"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="flex flex-col gap-2 md:col-span-3">
          <p className="text-xs text-zinc-500">Banner rasmi: URL yoki fayl (majburiy — biri bo'lishi kerak)</p>
          <div className="flex flex-wrap items-stretch gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Rasm URL"
              required
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2"
            />
            <ImageUpload folder="banners" onUploaded={setImageUrl} />
          </div>
        </div>
        <input
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
          placeholder="Tugma matni (masalan: Ko'rish)"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={actionPath}
          onChange={(e) => setActionPath(e.target.value)}
          placeholder="Yo'nalish (masalan: /home/stores)"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          placeholder="Tartib"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="flex gap-2 md:col-span-3">
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">
            {isEditing ? "Yangilash" : "Qo'shish"}
          </button>
          {isEditing ? (
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-4 py-2"
              onClick={resetForm}
            >
              Bekor qilish
            </button>
          ) : null}
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{banner.title}</p>
            <p className="text-xs text-zinc-500">{banner.subtitle ?? "—"}</p>
            <p className="truncate text-xs text-zinc-500">{banner.image_url}</p>
            <p className="truncate text-xs text-zinc-500">Tugma: {banner.button_text ?? "—"}</p>
            <p className="truncate text-xs text-zinc-500">Yo'l: {banner.action_path ?? "—"}</p>
            <p className="text-xs text-zinc-500">Tartib: {banner.sort_order ?? 0}</p>
            <p className="mt-2 text-xs text-zinc-600">Holat: {banner.active ? "faol" : "o'chirilgan"}</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onEdit(banner)}>
                Tahrirlash
              </button>
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onToggle(banner)}>
                Almashirish
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(banner.id)}>
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
