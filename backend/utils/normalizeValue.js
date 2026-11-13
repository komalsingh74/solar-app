
const normalizeValue = (value, format = "lower") => {
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();

  switch (format) {
    case "upper":
      return trimmedValue.toUpperCase();

    case "lower":
    default:
      return trimmedValue.toLowerCase();
  }
};

export default normalizeValue;
