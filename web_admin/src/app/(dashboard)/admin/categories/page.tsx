"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/ui/image-upload";

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number | null;
  image_url: string | null;
};

const supabase = createSupabaseBrowserClient();

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRows = async () => {
    const { data, error } = await supabase.from("categories").select("id,name,sort_order,image_url").order("sort_order", { ascending: true }).order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as CategoryRow[]);
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSortOrder("0");
    setImageUrl("");
  };

  const onCreateOrUpdate = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Kategoriya nomini kiriting");
      return;
    }
    setSaving(true);
    const payload = {
      name: cleanName,
      sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      image_url: imageUrl.trim() ? imageUrl.trim() : null,
    };

    const result =
      editingId == null
        ? await supabase.from("categories").insert(payload)
        : await supabase.from("categories").update(payload).eq("id", editingId);
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(editingId == null ? "Kategoriya qo'shildi" : "Kategoriya yangilandi");
    resetForm();
    await loadRows();
  };

  const onEdit = (row: CategoryRow) => {
    setEditingId(row.id);
    setName(row.name);
    setSortOrder(String(row.sort_order ?? 0));
    setImageUrl(row.image_url ?? "");
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kategoriya o'chirildi");
    setRows((prev) => prev.filter((item) => item.id !== id));
    if (editingId == id) resetForm();
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Kategoriyalar</h1>
      <p className="text-sm text-zinc-500">
        Bosh sahifadagi qidiruv yonidagi filtrda ko'rinadigan kategoriyalarni boshqaring.
      </p>

      <form onSubmit={onCreateOrUpdate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_180px_1fr_auto_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kategoriya nomi"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="Sort order"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <div className="space-y-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Rasm URL (ixtiyoriy)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          <ImageUpload folder="categories" onUploaded={setImageUrl} />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {editingId == null ? "Qo'shish" : "Saqlash"}
        </button>
        {editingId != null ? (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-zinc-300 px-4 py-2"
          >
            Bekor qilish
          </button>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[620px] text-sm md:min-w-full">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nomi</th>
              <th className="px-4 py-3">Rasm</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">
                  {row.image_url ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                      <Image src={row.image_url} alt={row.name} fill sizes="40px" className="object-cover" />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{row.sort_order ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded border border-zinc-300 px-3 py-1 text-xs"
                    >
                      Tahrirlash
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
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
