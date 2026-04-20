import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { RestaurantMenuClient, type MenuItem, type Restaurant } from "./restaurant-menu-client";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("restaurants").select("name").eq("id", id).maybeSingle();
    const name = data && typeof data === "object" && "name" in data ? String((data as { name: string }).name) : null;
    if (name) return { title: `${name} | Minutka` };
  } catch {
    /* env missing at build */
  }
  return { title: "Restoran | Minutka" };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: rest }, { data: rows }] = await Promise.all([
    supabase.from("restaurants").select("id,name,image_url").eq("id", id).maybeSingle(),
    supabase
      .from("menu_items")
      .select("id,restaurant_id,name,category,description,price_cents,image_url,is_available,sort_order")
      .eq("restaurant_id", id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const restaurant = (rest as Restaurant | null) ?? null;
  const items = (rows ?? []) as MenuItem[];

  return <RestaurantMenuClient restaurant={restaurant} items={items} />;
}
