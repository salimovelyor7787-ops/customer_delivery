"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
};

export type RestaurantOwnerRow = {
  id: string;
  name: string;
  owner_id: string | null;
};

const ROLES = ["customer", "courier", "restaurant", "admin"] as const;
type AppRole = (typeof ROLES)[number];

type Draft = { role: AppRole; restaurantId: string };

function roleFromDb(r: string): AppRole {
  return (ROLES as readonly string[]).includes(r) ? (r as AppRole) : "customer";
}

function ownedRestaurantId(restaurants: RestaurantOwnerRow[], userId: string): string {
  return restaurants.find((x) => x.owner_id === userId)?.id ?? "";
}

export function UserRolesTable({
  users,
  restaurants,
  currentUserId,
}: {
  users: ProfileRow[];
  restaurants: RestaurantOwnerRow[];
  currentUserId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const u of users) {
      init[u.id] = {
        role: roleFromDb(u.role),
        restaurantId: ownedRestaurantId(restaurants, u.id),
      };
    }
    return init;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const setDraft = (userId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }));
  };

  const saveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    if (draft.role === "restaurant" && !draft.restaurantId) {
      toast.error("Restoran admini uchun restoran tanlang");
      return;
    }

    setSavingId(userId);
    try {
      const { error: clearErr } = await supabase.from("restaurants").update({ owner_id: null }).eq("owner_id", userId);
      if (clearErr) throw clearErr;

      if (draft.role === "restaurant") {
        const { error: ownErr } = await supabase.from("restaurants").update({ owner_id: userId }).eq("id", draft.restaurantId);
        if (ownErr) throw ownErr;
      }

      const { error: roleErr } = await supabase.from("profiles").update({ role: draft.role }).eq("id", userId);
      if (roleErr) throw roleErr;

      toast.success("Rol va restoran biriktiruvi yangilandi");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Saqlashda xatolik";
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-[960px] text-sm md:min-w-full">
        <thead className="bg-zinc-50 text-left text-zinc-500">
          <tr>
            <th className="px-4 py-3">Ism</th>
            <th className="px-4 py-3">Telefon</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Restoran (faqat restoran admini)</th>
            <th className="px-4 py-3 w-32" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const draft = drafts[u.id];
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={draft?.role ?? "customer"}
                    disabled={isSelf}
                    onChange={(e) => setDraft(u.id, { role: e.target.value as AppRole })}
                    className="w-full max-w-[11rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {isSelf ? <p className="mt-1 text-xs text-zinc-400">O&apos;z rolingizni bu yerda o&apos;zgartirmang</p> : null}
                </td>
                <td className="px-4 py-3">
                  {draft?.role === "restaurant" ? (
                    <select
                      value={draft.restaurantId}
                      onChange={(e) => setDraft(u.id, { restaurantId: e.target.value })}
                      className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900"
                    >
                      <option value="">— Restoran tanlang —</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.owner_id && r.owner_id !== u.id ? " (boshqa egasi bor)" : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={isSelf || savingId === u.id}
                    onClick={() => void saveUser(u.id)}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    {savingId === u.id ? "Saqlanmoqda…" : "Saqlash"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
