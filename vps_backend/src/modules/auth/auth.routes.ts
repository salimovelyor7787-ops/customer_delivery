import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pgPool } from "../../db/pool.js";
import { signAccessToken } from "./jwt.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createAuthRouter() {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    try {
      const body = registerSchema.parse(req.body);
      const hash = await bcrypt.hash(body.password, 10);
      const inserted = await pgPool.query<{ id: string; role: "user" | "courier" | "admin" }>(
        `insert into users (email, password_hash, role, full_name, phone)
         values ($1,$2,'user',$3,$4)
         returning id, role`,
        [body.email.toLowerCase(), hash, body.full_name, body.phone ?? null],
      );
      const user = inserted.rows[0];
      const token = signAccessToken({ sub: user.id, role: user.role, phone: body.phone ?? null });
      res.status(201).json({ access_token: token, user_id: user.id, role: user.role });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);
      const userRes = await pgPool.query<{
        id: string;
        role: "user" | "courier" | "admin";
        password_hash: string;
        phone: string | null;
      }>("select id, role, password_hash, phone from users where email = $1 limit 1", [body.email.toLowerCase()]);
      if (!userRes.rowCount) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const user = userRes.rows[0];
      const ok = await bcrypt.compare(body.password, user.password_hash);
      if (!ok) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signAccessToken({ sub: user.id, role: user.role, phone: user.phone });
      res.json({ access_token: token, user_id: user.id, role: user.role });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
