import { StatCard } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/guards";

export default async function RestaurantDashboardPage() {
  const { supabase, user } = await requireRole(["restaurant"]);

  const { data: restaurant } = await supabase.from("restaurants").select("id,name").eq("owner_id", user?.id).single();
  const restaurantId = restaurant?.id;

  const [{ count: productsCount }, { count: activeOrdersCount }] = await Promise.all([
    supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId ?? "")
      .in("status", ["pending", "accepted", "cooking", "ready"]),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">{restaurant?.name ?? "Restoran"} paneli</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Mahsulotlar" value={productsCount ?? 0} />
        <StatCard label="Faol buyurtmalar" value={activeOrdersCount ?? 0} />
      </div>
    </section>
  );
}
