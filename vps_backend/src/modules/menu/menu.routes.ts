import { Router } from "express";
import { z } from "zod";
import { pgPool } from "../../db/pool.js";
import { redis } from "../../queue/redis.js";

export function createMenuRouter() {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const restaurantId = z.string().uuid().parse(req.query.restaurant_id);
      const cacheKey = `menu:list:${restaurantId}:v1`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const data = await pgPool.query(
        `select
            mi.id,
            mi.name,
            mi.description,
            mi.image_url,
            mi.price_cents,
            mi.is_available,
            coalesce(
              json_agg(
                json_build_object(
                  'id', mo.id,
                  'name', mo.name,
                  'price_delta_cents', mo.price_delta_cents
                )
              ) filter (where mo.id is not null),
              '[]'::json
            ) as options
         from menu_items mi
         left join menu_item_options mo on mo.menu_item_id = mi.id
         where mi.restaurant_id = $1
         group by mi.id
         order by mi.name asc`,
        [restaurantId],
      );
      await redis.set(cacheKey, JSON.stringify(data.rows), "EX", 60);
      res.json(data.rows);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
