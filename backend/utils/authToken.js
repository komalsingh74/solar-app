import jwt from "jsonwebtoken";
import AppError from "./AppError.js";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new AppError(
      "Authentication is not configured",
      500,
      "AUTH_CONFIG_ERROR"
    );
  }

  return secret;
};

export const signAuthToken = (user) => {
  const userId = user.id ?? user._id?.toString();
  if (!userId) throw new AppError("Cannot create token for this user", 500);

  return jwt.sign(
    { role: user.role },
    getSecret(),
    {
      algorithm: "HS256",
      subject: String(userId),
      expiresIn: "7d",
    }
  );
};

export const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid or expired token", 401);
  }
};
