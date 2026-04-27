import jwt from "jsonwebtoken";
import { HttpError } from "../../common/http-error.js";
const jwtSecret = process.env.JWT_ACCESS_SECRET;
const jwtTtl = (process.env.JWT_ACCESS_TTL || "15m");
if (!jwtSecret)
    throw new Error("JWT_ACCESS_SECRET is required");
export function signAccessToken(claims) {
    return jwt.sign(claims, jwtSecret, { expiresIn: jwtTtl });
}
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, jwtSecret);
    }
    catch {
        throw new HttpError(401, "Invalid token");
    }
}
