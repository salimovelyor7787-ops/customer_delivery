import { createSupabasePublicServerClient } from "@/lib/server/supabase-public";

export type HomeCatalogPayload = {
  restaurants: unknown[];
  categories: Record<string, string>;
  serviceCards: unknown[];
  serviceCardsVersion: string | null;
  banners: unknown[];
  deals: unknown[];
  nearbyCards: unknown[];
  hasNotifications: boolean;
};

export async function loadHomeCatalog(): Promise<HomeCatalogPayload> {
  const supabase = createSupabasePublicServerClient();
  const [{ data: rests }, { data: catRows }, { data: serviceRows }, { data: bannerRows }, { data: dealRows }, { data: nearbyRows }, { data: pushRows }] = await Promise.all([
    supabase.from("restaurants").select("id,name,image_url,is_open,delivery_fee_cents,category_id,category_ids").order("name", { ascending: true }),
    supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
    supabase.from("home_service_cards").select("id,service_key,title,image_url,banner_image_url,sort_order,updated_at").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase
      .from("banners")
      .select("id,image_url,title,subtitle,button_text,action_path,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(5),
    supabase.from("menu_items").select("id,restaurant_id,name,image_url,price_cents,deal_price_cents").eq("is_available", true).eq("is_deal", true).not("deal_price_cents", "is", null).order("sort_order", { ascending: true }).limit(10),
    supabase.from("home_nearby_cards").select("id,title,image_url,restaurant_id").eq("is_active", true).order("sort_order", { ascending: true }).limit(20),
    supabase.from("push_notifications").select("id").eq("is_active", true).limit(1),
  ]);

  const normalizedServiceRows = (serviceRows ?? []) as Array<{
    id: string;
    service_key: string;
    title: string;
    image_url: string | null;
    banner_image_url: string | null;
    updated_at: string | null;
  }>;
  const serviceCardsVersion =
    normalizedServiceRows.reduce<string | null>((latest, row) => {
      if (!row.updated_at) return latest;
      if (!latest || row.updated_at > latest) return row.updated_at;
      return latest;
    }, null) ?? null;

  return {
    restaurants: rests ?? [],
    categories: Object.fromEntries((catRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
    serviceCards: normalizedServiceRows.map((c) => ({
      id: c.id,
      key: c.service_key,
      title: c.title,
      image_url: c.image_url ?? null,
      banner_image_url: c.banner_image_url ?? null,
    })),
    serviceCardsVersion,
    banners: bannerRows ?? [],
    deals: dealRows ?? [],
    nearbyCards: nearbyRows ?? [],
    hasNotifications: (pushRows ?? []).length > 0,
  };
}
