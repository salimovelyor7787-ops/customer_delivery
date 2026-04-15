"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type PushNotification = {
  id: string;
  title: string;
  body: string | null;
  is_active: boolean;
  created_at: string;
};

const supabase = createSupabaseBrowserClient();

export default function AdminPushNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rows, setRows] = useState<PushNotification[]>([]);

  const loadRows = async () => {
    const { data, error } = await supabase
      .from("push_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as PushNotification[]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRows();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("push_notifications").insert({
      title: title.trim(),
      body: body.trim() || null,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Push bildirishnoma yaratildi");
    setTitle("");
    setBody("");
    await loadRows();
  };

  const onToggle = async (item: PushNotification) => {
    const { error } = await supabase
      .from("push_notifications")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_active: !row.is_active } : row)));
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("push_notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((row) => row.id !== id));
    toast.success("Push bildirishnoma o'chirildi");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Push bildirishnomalar</h1>
      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sarlavha"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Matn (ixtiyoriy)"
          className="min-h-24 rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-white">Qo&apos;shish</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Sarlavha</th>
              <th className="px-4 py-3">Matn</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.body ?? "—"}</td>
                <td className="px-4 py-3">{item.is_active ? "Faol" : "O'chirilgan"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                      onClick={() => void onToggle(item)}
                    >
                      Almashirish
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      onClick={() => void onDelete(item.id)}
                    >
                      O&apos;chirish
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
