"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Banner = { id: string; title: string; image_url: string; active: boolean };
const supabase = createSupabaseBrowserClient();

export default function AdminBannersPage() {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase.from("banners").select("*").order("title");
      setBanners((data ?? []) as Banner[]);
    };
    void fetchBanners();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("banners").insert({ title, image_url: imageUrl, active: true });
    if (error) return toast.error(error.message);
    setTitle("");
    setImageUrl("");
    toast.success("Banner created");
    const { data } = await supabase.from("banners").select("*").order("title");
    setBanners((data ?? []) as Banner[]);
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
    toast.success("Banner deleted");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Banners</h1>
      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Banner title"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white">Add banner</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{banner.title}</p>
            <p className="truncate text-xs text-zinc-500">{banner.image_url}</p>
            <p className="mt-2 text-xs text-zinc-600">Status: {banner.active ? "active" : "inactive"}</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onToggle(banner)}>
                Toggle
              </button>
              <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(banner.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
