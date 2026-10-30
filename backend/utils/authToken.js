import { createHmac } from "node:crypto";
import AppError from "./AppError.js";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("Authentication is not configured", 500, "AUTH_CONFIG_ERROR");
  }
  return secret;
};

export const signAuthToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", getSecret()).update(unsignedToken).digest("base64url");
  return `${unsignedToken}.${signature}`;
};
