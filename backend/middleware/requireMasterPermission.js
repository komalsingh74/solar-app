import AppError from "../utils/AppError.js";
import User from "../models/userSchema.js";
import asyncHandler from "../utils/asyncHandler.js";

const actionAliases = {
  GET: ["view", "read"],
  POST: ["create"],
  PATCH: ["edit", "update"],
  DELETE: ["delete"],
};

const resourceAliases = {
  customers: ["customer", "customers"],
  "lead-sources": ["lead-source", "lead-sources"],
  items: ["item", "items", "product", "products"],
  suppliers: ["supplier", "suppliers"],
  warehouses: ["warehouse", "warehouses"],
  "expense-categories": ["expense-category", "expense-categories", "expenses"],
};

export default function requireMasterPermission(resource) {
  return asyncHandler(async (req, res, next) => {
    if (["Admin", "SuperAdmin"].includes(req.auth?.role)) return next();

    const user = await User.findById(req.auth.userId).select("role permissions status");
    if (!user || user.status !== "Active") {
      return next(new AppError("User account is unavailable", 401, "AUTH_INVALID"));
    }
    // Enable permission enforcement explicitly once permissions are configured.
    if (process.env.MASTER_PERMISSIONS_ENABLED !== "true") return next();
    if (["Admin", "SuperAdmin"].includes(user.role)) return next();

    const permissions = Array.isArray(user.permissions)
      ? user.permissions.map((permission) => String(permission).toLowerCase())
      : [];
    const actions = actionAliases[req.method] || [];
    const resources = resourceAliases[resource] || [resource];
    const accepted = actions.flatMap((action) => [
      `masters:${resource}:${action}`,
      `master:${resource}:${action}`,
      ...resources.flatMap((name) => [
        `${name}:${action}`,
        `${name}.${action}`,
      ]),
      `masters:${action}`,
      `master:${action}`,
      `masters.${action}`,
      `master.${action}`,
    ]);

    if (
      accepted.some((permission) => permissions.includes(permission)) ||
      permissions.includes("*") ||
      permissions.includes("masters:*") ||
      permissions.includes("master:*")
    ) return next();
    return next(new AppError("You do not have permission to access this master record", 403, "PERMISSION_DENIED"));
  });
}
