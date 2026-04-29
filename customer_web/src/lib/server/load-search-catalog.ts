import { unstable_cache } from "next/cache";
import { createSupabasePublicServerClient } from "@/lib/server/supabase-public";

export type SearchCatalogPayload = {
  restaurants: Array<{
    id: string;
    name: string;
    image_url: string | null;
    is_open: boolean;
    category_id: string | null;
    category_ids: string[] | null;
  }>;
  categories: Record<string, string>;
  serviceCards: Array<{
    id: string;
    key: string;
    title: string;
    image_url: string | null;
    banner_image_url: string | null;
  }>;
};

export async function loadSearchCatalog(): Promise<SearchCatalogPayload> {
  const supabase = createSupabasePublicServerClient();
  const [{ data: rests }, { data: cats }, { data: serviceRows }] = await Promise.all([
    supabase.from("restaurants").select("id,name,image_url,is_open,category_id,category_ids").order("name", { ascending: true }),
    supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
    supabase.from("home_service_cards").select("id,service_key,title,image_url,banner_image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  return {
    restaurants: (rests ?? []) as SearchCatalogPayload["restaurants"],
    categories: Object.fromEntries((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
    serviceCards: ((serviceRows ?? []) as Array<{
      id: string;
      service_key: string;
      title: string;
      image_url: string | null;
      banner_image_url: string | null;
    }>).map((item) => ({
      id: item.id,
      key: item.service_key,
      title: item.title,
      image_url: item.image_url,
      banner_image_url: item.banner_image_url,
    })),
  };
}

export const getSearchCatalogCached = unstable_cache(async () => loadSearchCatalog(), ["customer-web-search-catalog"], {
  revalidate: 120,
});
