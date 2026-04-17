import { UserRolesTable } from "@/components/admin/user-roles-table";
import { requireRole } from "@/lib/guards";

export default async function AdminUsersPage() {
  const { supabase, sessionUserId } = await requireRole(["admin"]);
  const [{ data: profiles }, { data: restaurants }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone,role").order("full_name"),
    supabase.from("restaurants").select("id,name,owner_id").order("name"),
  ]);

  const tableKey = [
    (profiles ?? []).map((p) => `${p.id}:${p.role}`).join(","),
    (restaurants ?? []).map((r) => `${r.id}:${r.owner_id ?? ""}`).join(","),
  ].join("|");

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Foydalanuvchilar</h1>
      <p className="max-w-2xl text-sm text-zinc-600">
        Rolni belgilang. <span className="font-medium">restaurant</span> tanlansa, tanlangan restoranga foydalanuvchi{" "}
        <span className="font-medium">owner_id</span> sifatida biriktiriladi (oldingi biriktirish avtomatik tozalanadi).
      </p>
      <UserRolesTable key={tableKey} users={profiles ?? []} restaurants={restaurants ?? []} currentUserId={sessionUserId} />
    </section>
  );
}
