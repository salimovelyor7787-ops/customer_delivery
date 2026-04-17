import { createSupabasePublicServerClient } from "@/lib/server/supabase-public";

export type SearchCatalogPayload = {
  restaurants: unknown[];
  categories: Record<string, string>;
};

export async function loadSearchCatalog(): Promise<SearchCatalogPayload> {
  const supabase = createSupabasePublicServerClient();
  const [{ data: rests }, { data: cats }] = await Promise.all([
    supabase.from("restaurants").select("id,name,image_url,is_open,category_id,category_ids").order("name", { ascending: true }),
    supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
  ]);

  return {
    restaurants: rests ?? [],
    categories: Object.fromEntries((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
  };
}
