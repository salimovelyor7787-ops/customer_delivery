import { Router } from "express";
import { pgPool } from "../../db/pool.js";

export function createPromocodesRouter() {
  const router = Router();
  router.get("/", async (_req, res, next) => {
    try {
      const data = await pgPool.query(
        `select id, code, active, audience, min_subtotal_cents, expires_at
         from promocodes
         where active = true
         order by code asc`,
      );
      res.json(data.rows);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
