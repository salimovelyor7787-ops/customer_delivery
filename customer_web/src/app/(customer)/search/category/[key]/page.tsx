import Link from "next/link";
import { RestaurantHeroCard } from "@/components/customer/restaurant-hero-card";
import { loadSearchCatalog } from "@/lib/server/load-search-catalog";

type CategoryPageProps = {
  params: Promise<{ key: string }>;
};

export default async function SearchCategoryPage({ params }: CategoryPageProps) {
  const { key } = await params;
  const raw = await loadSearchCatalog();
  const serviceCards = raw.serviceCards;
  const currentCard = serviceCards.find((item) => item.key === key);

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{currentCard?.title ?? "Kategoriya"}</h1>
        <Link href="/search" className="text-sm font-medium text-orange-600 hover:text-orange-700">
          Orqaga
        </Link>
      </div>

      {!currentCard ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Kategoriya topilmadi.
        </p>
      ) : currentCard.key === "restaurants" ? (
        <section className="space-y-4 sm:space-y-5">
          {raw.restaurants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
              Hozircha restoranlar yo&apos;q.
            </p>
          ) : (
            raw.restaurants.map((restaurant, index) => (
              <RestaurantHeroCard
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.name}
                imageUrl={restaurant.image_url}
                compact
                listIndex={index}
                isOpen={restaurant.is_open}
              />
            ))
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Tez orada ushbu sahifadan buyurtma berish mumkin bo&apos;ladi
        </p>
      )}
    </main>
  );
}
