import { Router } from "express";
import { authRequired } from "../auth/auth.middleware.js";
export function createUsersRouter() {
    const router = Router();
    router.get("/me", authRequired, (req, res) => {
        res.json({ user: req.user });
    });
    return router;
}
