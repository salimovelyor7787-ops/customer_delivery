import { NextResponse } from "next/server";
import { loadHomeCatalog } from "@/lib/server/load-home-catalog";
import { redis } from "@/lib/redis";

const CACHE_ENV = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev";
const HOME_CACHE_KEY = `cw:${CACHE_ENV}:home:v2`;
const HOME_CACHE_TTL_SECONDS = 60;

export async function GET() {
  try {
    if (redis) {
      try {
        const cached = await redis.get(HOME_CACHE_KEY);
        if (cached) {
          console.info("[api/home]", { cache: "hit", key: HOME_CACHE_KEY });
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

    const dbStartedAt = Date.now();
    const data = await loadHomeCatalog();
    const dbMs = Date.now() - dbStartedAt;
    console.info("[api/home]", { cache: "miss", key: HOME_CACHE_KEY, dbMs });
    if (redis) {
      try {
        await redis.set(HOME_CACHE_KEY, data, { ex: HOME_CACHE_TTL_SECONDS });
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
