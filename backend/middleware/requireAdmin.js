import AppError from "../utils/AppError.js";

export default function requireAdmin(req, res, next) {
  if (!["Admin", "SuperAdmin"].includes(req.auth?.role)) return next(new AppError("Administrator access is required", 403, "ADMIN_REQUIRED"));
  return next();
}
