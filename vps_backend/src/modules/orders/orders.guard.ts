import { Request, Response, NextFunction } from "express";
import { redis } from "../../queue/redis.js";

const WINDOW_SECONDS = 10;
const MAX_HITS = 5;
const DEDUPE_SECONDS = 15;

function clientKey(req: Request) {
  const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  return userId ? `u:${userId}` : `ip:${ip}`;
}

export async function orderRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `rl:orders:${clientKey(req)}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  if (count > MAX_HITS) {
    res.status(429).json({ error: "Too many order requests, slow down" });
    return;
  }
  next();
}

export async function requestDedupe(req: Request, res: Response, next: NextFunction) {
  const requestId = req.body?.request_id;
  if (typeof requestId !== "string" || requestId.trim().length === 0) {
    next();
    return;
  }
  const lockKey = `dedupe:orders:${requestId.trim()}`;
  const acquired = await redis.set(lockKey, "1", "EX", DEDUPE_SECONDS, "NX");
  if (!acquired) {
    res.status(409).json({ error: "Duplicate request in progress" });
    return;
  }
  next();
}
