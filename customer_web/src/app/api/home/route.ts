import { NextResponse } from "next/server";
import { loadHomeCatalog } from "@/lib/server/load-home-catalog";
import { redis } from "@/lib/redis";

const CACHE_ENV = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev";
const HOME_CACHE_KEY = `cw:${CACHE_ENV}:home:v2`;
const HOME_CACHE_TTL_SECONDS = 60;
const HOME_CACHE_JITTER_SECONDS = 10;

function resolveCacheTtl(baseSeconds: number, jitterSeconds: number): number {
  const delta = Math.floor(Math.random() * (jitterSeconds * 2 + 1)) - jitterSeconds;
  return Math.max(1, baseSeconds + delta);
}

export async function GET() {
  const traceId = `home-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    if (redis) {
      try {
        const cached = await redis.get(HOME_CACHE_KEY);
        if (cached) {
          console.info(JSON.stringify({ scope: "api/home", traceId, cache: "hit", key: HOME_CACHE_KEY, latencyMs: 0 }));
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
    console.info(JSON.stringify({ scope: "api/home", traceId, cache: "miss", key: HOME_CACHE_KEY, latencyMs: dbMs }));
    if (redis) {
      try {
        await redis.set(HOME_CACHE_KEY, data, { ex: resolveCacheTtl(HOME_CACHE_TTL_SECONDS, HOME_CACHE_JITTER_SECONDS) });
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
