import { Router } from "express";
import { authRequired, type AuthRequest } from "../auth/auth.middleware.js";

export function createUsersRouter() {
  const router = Router();
  router.get("/me", authRequired, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });
  return router;
}
