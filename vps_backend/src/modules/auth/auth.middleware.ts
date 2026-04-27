import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type JwtClaims } from "./jwt.js";

export type AuthRequest = Request & { user?: JwtClaims };

export function authOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    req.user = verifyAccessToken(header.slice(7).trim());
  }
  next();
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  authOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}
