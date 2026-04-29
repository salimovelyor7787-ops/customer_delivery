import { getSearchCatalogCached } from "@/lib/server/load-search-catalog";
import { SearchPageClient, type SearchPageInitialPayload } from "./search-page-client";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await getSearchCatalogCached();
  const resolvedParams = searchParams ? await searchParams : {};
  const rawQuery = resolvedParams.q;
  const initialQuery =
    typeof rawQuery === "string" ? rawQuery : Array.isArray(rawQuery) ? rawQuery[0] ?? "" : "";
  const initial: SearchPageInitialPayload = {
    restaurants: raw.restaurants,
    categories: raw.categories,
    serviceCards: raw.serviceCards,
    initialQuery,
  };

  return <SearchPageClient initial={initial} />;
}
