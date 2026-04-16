import { requireRole } from "@/lib/guards";

export default async function AdminUsersPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("profiles").select("id,full_name,phone,role").order("full_name");

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Foydalanuvchilar</h1>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[640px] text-sm md:min-w-full">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Ism</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((user) => (
              <tr key={user.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{user.full_name}</td>
                <td className="px-4 py-3">{user.phone}</td>
                <td className="px-4 py-3 capitalize">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
