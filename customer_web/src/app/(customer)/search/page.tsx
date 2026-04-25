import { loadSearchCatalog } from "@/lib/server/load-search-catalog";
import { SearchPageClient, type SearchPageInitialPayload } from "./search-page-client";

export default async function SearchPage() {
  const raw = await loadSearchCatalog();
  const initial: SearchPageInitialPayload = {
    restaurants: raw.restaurants,
    categories: raw.categories,
    serviceCards: raw.serviceCards,
  };

  return <SearchPageClient initial={initial} />;
}
