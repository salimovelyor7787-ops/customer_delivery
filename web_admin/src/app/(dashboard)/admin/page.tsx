import { RealtimeOrders } from "@/components/orders/realtime-orders";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/guards";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole(["admin"]);

  const [{ count: ordersCount }, { count: usersCount }, { data: orders }, { data: revenueRows }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("id,status,total_cents,created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("orders").select("total_cents"),
  ]);

  const revenueCents = (revenueRows ?? []).reduce((acc, row) => acc + Number(row.total_cents ?? 0), 0);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin boshqaruvi</h1>
        <p className="text-sm text-zinc-500">Asosiy ko'rsatkichlar va buyurtmalar.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Jami buyurtmalar" value={ordersCount ?? 0} />
        <StatCard label="Jami tushum" value={`$${(revenueCents / 100).toFixed(2)}`} />
        <StatCard label="Foydalanuvchilar" value={usersCount ?? 0} />
      </div>

      <RealtimeOrders initialOrders={(orders ?? []) as never[]} />
    </section>
  );
}
