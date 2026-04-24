import { unstable_cache } from "next/cache";
import { loadHomeCatalog } from "@/lib/server/load-home-catalog";
import { HomePageClient, type HomePageInitialPayload } from "./home-page-client";

const getHomeCatalog = unstable_cache(async () => loadHomeCatalog(), ["customer-web-home-catalog"], { revalidate: 120 });

export default async function HomePage() {
  const raw = await getHomeCatalog();
  const initial: HomePageInitialPayload = {
    restaurants: raw.restaurants as HomePageInitialPayload["restaurants"],
    categories: raw.categories,
    categoryCards: raw.categoryCards as HomePageInitialPayload["categoryCards"],
    banners: raw.banners as HomePageInitialPayload["banners"],
    deals: raw.deals as HomePageInitialPayload["deals"],
    nearbyCards: raw.nearbyCards as HomePageInitialPayload["nearbyCards"],
    hasNotifications: raw.hasNotifications,
  };
  return <HomePageClient initial={initial} />;
}
