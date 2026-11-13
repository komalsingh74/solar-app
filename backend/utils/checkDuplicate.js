
import AppError from "./AppError.js";
import normalizeValue from "./normalizeValue.js";

const checkDuplicate = async ({
  Model,
  value,
  field,
  normalizedField,
  format = "lower",
  excludeId = null,
  message = "Record already exists",
}) => {
  const normalizedValue = normalizeValue(value, format);
  if (typeof normalizedValue !== "string" || !normalizedValue) return null;

  const conditions = [{ [normalizedField]: normalizedValue }];
  if (field) {
    const escapedValue = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({ [field]: new RegExp(`^${escapedValue}$`, "i") });
  }

  const query = {
    $or: conditions,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  if (await Model.exists(query)) {
    throw new AppError(message, 409, "DUPLICATE_RESOURCE");
  }

  return normalizedValue;
};

export default checkDuplicate;
