import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/server/supabase-public";
import { enforceIpRateLimit } from "@/lib/server/rate-limit";
import { redis } from "@/lib/redis";

const CACHE_ENV = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev";
const SEARCH_CACHE_TTL_SECONDS = 60;

function parseLimit(raw: string | null): number {
  const value = Number(raw ?? 20);
  if (!Number.isFinite(value)) return 20;
  if (value < 1) return 1;
  if (value > 50) return 50;
  return Math.floor(value);
}

function parseOffset(raw: string | null): number {
  const value = Number(raw ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function buildSearchCacheKey(req: Request): string {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));
  const normalizedQuery = q ? encodeURIComponent(q.toLowerCase()) : "__empty__";
  return `cw:${CACHE_ENV}:search:v2:q:${normalizedQuery}:limit:${limit}:offset:${offset}`;
}

export async function GET(req: Request) {
  try {
    const allowed = await enforceIpRateLimit(req, "rl:search", 20);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const cacheKey = buildSearchCacheKey(req);
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.info("[api/search]", { cache: "hit", key: cacheKey });
          return NextResponse.json(cached, {
            headers: {
              "Cache-Control": "public, s-maxage=120, max-age=60, stale-while-revalidate=600",
            },
          });
        }
      } catch {
        // Ignore Redis read errors and fall back to existing flow.
      }
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = parseLimit(url.searchParams.get("limit"));
    const offset = parseOffset(url.searchParams.get("offset"));
    const supabase = createSupabasePublicServerClient();

    const dbStartedAt = Date.now();
    const [{ data: categoriesRows }, { data: serviceRows }, { data: restaurantsRows }] = await Promise.all([
      supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
      supabase
        .from("home_service_cards")
        .select("id,service_key,title,image_url,banner_image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      q
        ? supabase
            .from("restaurants")
            .select("id,name,image_url,is_open,category_id,category_ids")
            .ilike("name", `%${q}%`)
            .order("name", { ascending: true })
            .range(offset, offset + limit - 1)
        : supabase
            .from("restaurants")
            .select("id,name,image_url,is_open,category_id,category_ids")
            .order("name", { ascending: true })
            .range(0, Math.min(4, limit) - 1),
    ]);
    const data = {
      restaurants: (restaurantsRows ?? []) as Array<{
        id: string;
        name: string;
        image_url: string | null;
        is_open: boolean;
        category_id: string | null;
        category_ids: string[] | null;
      }>,
      categories: Object.fromEntries((categoriesRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name])),
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
    const dbMs = Date.now() - dbStartedAt;
    console.info("[api/search]", { cache: "miss", key: cacheKey, dbMs, q: q ? "set" : "empty", limit, offset });
    if (redis) {
      try {
        await redis.set(cacheKey, data, { ex: SEARCH_CACHE_TTL_SECONDS });
      } catch {
        // Ignore Redis write errors and return fresh response.
      }
    }
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
