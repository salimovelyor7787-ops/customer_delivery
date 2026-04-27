import { Router } from "express";
import { pgPool } from "../../db/pool.js";

export function createCouriersRouter() {
  const router = Router();
  router.get("/locations", async (_req, res, next) => {
    try {
      const data = await pgPool.query(
        `select order_id, courier_id, lat, lng, updated_at
         from courier_locations
         order by updated_at desc
         limit 200`,
      );
      res.json(data.rows);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
