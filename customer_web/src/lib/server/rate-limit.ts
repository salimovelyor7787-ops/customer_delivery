import { redis } from "@/lib/redis";

const WINDOW_SECONDS = 60;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  return "unknown";
}

export async function enforceIpRateLimit(req: Request, keyPrefix: string, limitPerMinute = 20): Promise<boolean> {
  if (!redis) return true;
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return count <= limitPerMinute;
  } catch {
    // Fail-open to avoid breaking API if Redis is unavailable.
    return true;
  }
}
