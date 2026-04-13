import { requireRole } from "@/lib/guards";

export default async function AdminRestaurantsPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("restaurants").select("id,name,owner_id").order("name");

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Restaurants</h1>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Owner ID</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((restaurant) => (
              <tr key={restaurant.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{restaurant.name}</td>
                <td className="px-4 py-3 text-xs">{restaurant.owner_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
