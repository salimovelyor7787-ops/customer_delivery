import { Router } from "express";
import { pgPool } from "../../db/pool.js";
import { redis } from "../../queue/redis.js";

export function createRestaurantsRouter() {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const cacheKey = "restaurants:list:v1";
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
      const data = await pgPool.query(
        `select id, name, is_open, image_url, delivery_fee_cents, min_order_cents
         from restaurants
         order by name asc`,
      );
      await redis.set(cacheKey, JSON.stringify(data.rows), "EX", 60);
      res.json(data.rows);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
