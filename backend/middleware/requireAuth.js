import AppError from "../utils/AppError.js";
import { verifyAuthToken } from "../utils/authToken.js";

export default function requireAuth(req, res, next) {
  try {
    const [scheme, token, ...extra] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token || extra.length) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const claims = verifyAuthToken(token);
    if (!claims.sub) {
      throw new AppError("Invalid or expired authentication token", 401, "AUTH_INVALID");
    }

    req.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Invalid or expired authentication token", 401, "AUTH_INVALID"));
  }
}
