import { createHmac, timingSafeEqual } from "node:crypto";
import AppError from "../utils/AppError.js";

export default function requireAuth(req, res, next) {
  try {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed token");
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new AppError("Authentication is not configured", 500, "AUTH_CONFIG_ERROR");
    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    const provided = Buffer.from(parts[2], "base64url");
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new Error("Invalid signature");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!claims.sub || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) throw new Error("Invalid claims");
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Invalid or expired authentication token", 401, "AUTH_INVALID"));
  }
}
