"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type PushNotification = { id: string; title: string; body: string | null; created_at: string };

export default function NotificationsPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<PushNotification[]>([]);

  useEffect(() => {
    supabase.from("push_notifications").select("id,title,body,created_at").eq("is_active", true).order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as PushNotification[]));
  }, [supabase]);

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Bildirishnomalar</h1>
      {rows.length === 0 ? <p className="text-sm text-zinc-500">Hozircha bildirishnoma yo&apos;q.</p> : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="font-medium">{row.title}</p>
            {row.body ? <p className="mt-1 text-sm text-zinc-600">{row.body}</p> : null}
            <p className="mt-2 text-xs text-zinc-400">{new Date(row.created_at).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
