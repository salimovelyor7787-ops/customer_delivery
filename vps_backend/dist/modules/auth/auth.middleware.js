import { verifyAccessToken } from "./jwt.js";
export function authOptional(req, _res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
        req.user = verifyAccessToken(header.slice(7).trim());
    }
    next();
}
export function authRequired(req, res, next) {
    authOptional(req, res, () => {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        next();
    });
}
