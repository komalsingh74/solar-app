import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import TelephonyConnection from "../../models/TelephonyConnection.js";
import AppError from "../../utils/AppError.js";

const encryptionKey = () => {
  const raw = process.env.TELEPHONY_ENCRYPTION_KEY || "";
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new AppError("TELEPHONY_ENCRYPTION_KEY must encode 32 random bytes", 500, "TELEPHONY_ENCRYPTION_KEY_INVALID");
  return key;
};

export function encryptSecret(value) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value) {
  if (!value) return "";
  try {
    const [iv, tag, data] = value.split("."); const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Stored telephony credential could not be decrypted", 500, "TELEPHONY_CREDENTIAL_DECRYPTION_FAILED");
  }
}

export const normalizePhone = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return digits;
};

export async function getProviderHealth() {
  const connection = await TelephonyConnection.findOne().select("provider accountId healthUrl connectedAt").lean();
  if (!connection) return { configured: false, status: "not_configured", provider: null, checkedAt: new Date().toISOString() };
  if (!connection.healthUrl) return { configured: true, status: "unverified", provider: connection.provider, checkedAt: new Date().toISOString(), message: "Credentials are stored, but no provider health URL is configured. Connectivity is unverified." };
  let url;
  try { url = new URL(connection.healthUrl); } catch { throw new AppError("Provider health URL is invalid", 500, "INVALID_PROVIDER_HEALTH_URL"); }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new AppError("Provider health checks must use HTTPS in production", 500, "INSECURE_PROVIDER_HEALTH_URL");
  const secretRecord = await TelephonyConnection.findById(connection._id).select("+authTokenEncrypted").lean();
  const authToken = decryptSecret(secretRecord.authTokenEncrypted);
  try {
    const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${authToken}`, "X-Account-Id": connection.accountId }, signal: AbortSignal.timeout(5000) });
    return { configured: true, status: response.ok ? "endpoint_reachable" : "endpoint_error", provider: connection.provider, checkedAt: new Date().toISOString(), httpStatus: response.status, message: response.ok ? "Configured health URL responded successfully. Provider capabilities are not verified by this generic check." : "Configured health URL returned a non-success response." };
  } catch {
    return { configured: true, status: "unreachable", provider: connection.provider, checkedAt: new Date().toISOString() };
  }
}

export async function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false;
  const connection = await TelephonyConnection.findOne().select("+webhookSecretEncrypted").lean();
  if (!connection?.webhookSecretEncrypted) return false;
  const secret = decryptSecret(connection.webhookSecretEncrypted);
  const digest = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const candidate = Buffer.from(String(signature));
  return digest.length === candidate.length && timingSafeEqual(digest, candidate);
}

export function formattedAccountId(accountId) { return accountId ? `${accountId.slice(0, 2)}••••` : null; }
