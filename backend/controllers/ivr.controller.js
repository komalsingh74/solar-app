import IvrConfiguration from "../models/IvrConfiguration.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import TelephonyConnection from "../models/TelephonyConnection.js";
import { encryptSecret, formattedAccountId, getProviderHealth } from "../services/telephony/provider.service.js";

export const getConfiguration = asyncHandler(async (req, res) => {
  const configuration = await IvrConfiguration.findOne().lean();
  res.json({ success: true, data: { configuration: configuration || null } });
});

export const saveConfiguration = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const options = Array.isArray(body.options) ? body.options : [];
  if (options.length > 10) throw new AppError("An IVR menu can have at most 10 keypad options", 400, "TOO_MANY_OPTIONS");
  const digits = options.map((option) => String(option.digit));
  if (new Set(digits).size !== digits.length) throw new AppError("Each IVR keypad digit must be unique", 400, "DUPLICATE_DIGIT");
  if (options.some((option) => option.enabled !== false && (!option.label?.trim() || !option.prompt?.trim() || !option.destination?.trim()))) throw new AppError("Enabled menu options need a label, prompt, and destination", 400, "INCOMPLETE_IVR_OPTION");
  const patch = {
    name: typeof body.name === "string" ? body.name.trim() : "Main number",
    virtualNumber: typeof body.virtualNumber === "string" ? body.virtualNumber.trim() : "",
    language: typeof body.language === "string" ? body.language.trim() : "hi-IN",
    greeting: typeof body.greeting === "string" ? body.greeting.trim() : "",
    enabled: body.enabled === true,
    options,
    invalidInput: body.invalidInput || "replay_once",
    fallbackNumber: typeof body.fallbackNumber === "string" ? body.fallbackNumber.trim() : "",
    businessHours: typeof body.businessHours === "string" ? body.businessHours.trim() : "",
    updatedBy: req.auth.userId,
  };
  if (patch.enabled && (!patch.greeting || !options.some((option) => option.enabled !== false))) throw new AppError("An active IVR needs a greeting and at least one enabled menu option", 400, "INCOMPLETE_IVR");
  const configuration = await IvrConfiguration.findOneAndUpdate({}, { $set: patch }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ success: true, data: { configuration } });
});

export const settingsStatus = asyncHandler(async (req, res) => {
  const [provider, connection] = await Promise.all([
    getProviderHealth(),
    TelephonyConnection.findOne().select("provider accountId healthUrl virtualNumber +authTokenEncrypted +webhookSecretEncrypted").lean(),
  ]);
  res.json({ success: true, data: { provider, credentials: { configured: Boolean(connection), provider: connection?.provider || null, accountId: connection?.accountId || null, healthUrl: connection?.healthUrl || "", virtualNumber: connection?.virtualNumber || "", hasAuthToken: Boolean(connection?.authTokenEncrypted) }, webhook: { configured: Boolean(connection?.webhookSecretEncrypted), endpoint: "/api/webhooks/telephony/events" } } });
});

export const saveProviderSettings = asyncHandler(async (req, res) => {
  const { provider, accountId, authToken, webhookSecret, healthUrl = "", virtualNumber = "" } = req.body || {};
  if (typeof provider !== "string" || !provider.trim() || provider.trim().length > 80) throw new AppError("Provider name is required", 400, "INVALID_PROVIDER");
  if (typeof accountId !== "string" || accountId.trim().length > 160) throw new AppError("Provider account ID must be a string under 160 characters", 400, "INVALID_ACCOUNT_ID");
  if (typeof authToken !== "string" || authToken.length > 2000 || typeof webhookSecret !== "string" || webhookSecret.length > 2000) throw new AppError("Credential values must be strings under 2,000 characters", 400, "INVALID_CREDENTIAL");
  if (typeof healthUrl !== "string" || typeof virtualNumber !== "string") throw new AppError("Health URL and virtual number must be strings", 400, "INVALID_PROVIDER_SETTINGS");
  let parsedHealthUrl = "";
  if (healthUrl.trim()) {
    try { parsedHealthUrl = new URL(healthUrl.trim()).toString(); } catch { throw new AppError("Enter a valid provider health URL", 400, "INVALID_PROVIDER_HEALTH_URL"); }
    if (process.env.NODE_ENV === "production" && !parsedHealthUrl.startsWith("https://")) throw new AppError("Provider health URL must use HTTPS", 400, "INSECURE_PROVIDER_HEALTH_URL");
  }
  const existing = await TelephonyConnection.findOne().select("+authTokenEncrypted +webhookSecretEncrypted");
  if (!existing && !accountId.trim()) throw new AppError("Provider account ID is required for a new connection", 400, "INVALID_ACCOUNT_ID");
  if (!existing && !authToken.trim()) throw new AppError("Provider auth token is required for a new connection", 400, "AUTH_TOKEN_REQUIRED");
  if (!existing && !webhookSecret.trim()) throw new AppError("Webhook signing secret is required for a new connection", 400, "WEBHOOK_SECRET_REQUIRED");
  if (webhookSecret.trim() && webhookSecret.trim().length < 32) throw new AppError("Webhook signing secret must be at least 32 characters", 400, "WEAK_WEBHOOK_SECRET");
  if (existing && (provider.trim() !== existing.provider || (accountId.trim() && accountId.trim() !== existing.accountId)) && !authToken.trim()) throw new AppError("Enter the provider token again when changing provider or account ID", 400, "AUTH_TOKEN_ROTATION_REQUIRED");
  const patch = { provider: provider.trim(), accountId: accountId.trim() || existing?.accountId, healthUrl: parsedHealthUrl, virtualNumber: virtualNumber.trim().slice(0, 40), updatedBy: req.auth.userId };
  if (authToken.trim()) patch.authTokenEncrypted = encryptSecret(authToken.trim());
  if (webhookSecret.trim()) patch.webhookSecretEncrypted = encryptSecret(webhookSecret.trim());
  const connection = await TelephonyConnection.findOneAndUpdate({}, { $set: patch }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).select("provider accountId healthUrl virtualNumber");
  res.json({ success: true, message: "Provider credentials encrypted and saved", data: { provider: connection.provider, accountId: formattedAccountId(connection.accountId), healthUrl: connection.healthUrl, virtualNumber: connection.virtualNumber } });
});

export const getMappingSettings = asyncHandler(async (req, res) => {
  const configuration = await IvrConfiguration.findOne().select("createLeadForUnknown").lean();
  res.json({ success: true, data: { createLeadForUnknown: configuration?.createLeadForUnknown ?? false } });
});

export const saveMappingSettings = asyncHandler(async (req, res) => {
  if (typeof req.body?.createLeadForUnknown !== "boolean") throw new AppError("createLeadForUnknown must be a boolean", 400, "INVALID_MAPPING_SETTING");
  const configuration = await IvrConfiguration.findOneAndUpdate({}, { $set: { createLeadForUnknown: req.body.createLeadForUnknown, updatedBy: req.auth.userId } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).select("createLeadForUnknown");
  res.json({ success: true, data: { createLeadForUnknown: configuration.createLeadForUnknown } });
});
