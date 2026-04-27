import jwt from "jsonwebtoken";
import { HttpError } from "../../common/http-error.js";

const jwtSecret = process.env.JWT_ACCESS_SECRET as string | undefined;
const jwtTtl = (process.env.JWT_ACCESS_TTL || "15m") as jwt.SignOptions["expiresIn"];
if (!jwtSecret) throw new Error("JWT_ACCESS_SECRET is required");

export type JwtClaims = {
  sub: string;
  role: "user" | "courier" | "admin";
  phone?: string | null;
};

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, jwtSecret as string, { expiresIn: jwtTtl } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtClaims {
  try {
    return jwt.verify(token, jwtSecret as string) as unknown as JwtClaims;
  } catch {
    throw new HttpError(401, "Invalid token");
  }
}
