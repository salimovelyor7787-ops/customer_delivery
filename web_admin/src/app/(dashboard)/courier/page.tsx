import { StatCard } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/guards";

export default async function CourierDashboardPage() {
  const { supabase, user } = await requireRole(["courier"]);

  const [{ count: assigned }, { count: delivered }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("courier_id", user?.id).neq("status", "delivered"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("courier_id", user?.id).eq("status", "delivered"),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Courier panel</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Assigned now" value={assigned ?? 0} />
        <StatCard label="Delivered total" value={delivered ?? 0} />
      </div>
    </section>
  );
}
