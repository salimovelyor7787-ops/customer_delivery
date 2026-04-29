import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

declare global {
  var __customerWebRedis: Redis | null | undefined;
}

function createRedisClient(): Redis | null {
  if (!redisUrl || !redisToken) return null;
  return new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

export const redis =
  globalThis.__customerWebRedis === undefined
    ? (globalThis.__customerWebRedis = createRedisClient())
    : globalThis.__customerWebRedis;
