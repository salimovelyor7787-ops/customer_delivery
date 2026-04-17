import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { loadSearchCatalog } from "@/lib/server/load-search-catalog";

const getSearchCatalog = unstable_cache(async () => loadSearchCatalog(), ["customer-web-search-catalog"], { revalidate: 120 });

export async function GET() {
  try {
    const data = await getSearchCatalog();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
