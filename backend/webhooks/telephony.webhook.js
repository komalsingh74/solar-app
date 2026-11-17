import { Router } from "express";
import CallLog from "../models/CallLog.js";
import FollowUp from "../models/FollowUp.js";
import IvrConfiguration from "../models/IvrConfiguration.js";
import Lead from "../models/lead.js";
import LeadSource from "../models/leadSource.js";
import User from "../models/userSchema.js";
import TelephonyConnection from "../models/TelephonyConnection.js";
import { findPhoneMatch } from "../controllers/call.controller.js";
import { normalizePhone, verifyWebhookSignature } from "../services/telephony/provider.service.js";
import AppError from "../utils/AppError.js";
import normalizeValue from "../utils/normalizeValue.js";

const router = Router();
const statuses = new Set(["ringing", "answered", "missed", "busy", "failed", "completed", "no-answer"]);

router.post("/events", async (req, res, next) => {
  try {
    const connection = await TelephonyConnection.findOne().select("provider").lean();
    if (!connection || !await verifyWebhookSignature(req.rawBody, req.get("x-telephony-signature"))) throw new AppError("Webhook signature is invalid", 401, "INVALID_WEBHOOK_SIGNATURE");
    const event = req.body || {};
    const providerCallId = String(event.providerCallId || "").trim();
    const from = String(event.from || "").trim(); const to = String(event.to || "").trim();
    const normalizedFrom = normalizePhone(from); const normalizedTo = normalizePhone(to);
    const direction = event.direction === "outbound" ? "outbound" : "inbound";
    const status = String(event.status || "").toLowerCase();
    const startedAt = event.startedAt ? new Date(event.startedAt) : new Date();
    if (!providerCallId || !normalizedFrom || !normalizedTo || !["inbound", "outbound"].includes(event.direction) || !statuses.has(status) || Number.isNaN(startedAt.getTime())) throw new AppError("Webhook event is missing valid call ID, phone numbers, status, direction, or timestamp", 400, "INVALID_WEBHOOK_EVENT");
    let match = direction === "inbound" ? await findPhoneMatch(normalizedFrom) : null;
    if (!match && direction === "inbound") {
      const ivr = await IvrConfiguration.findOne().select("createLeadForUnknown").lean();
      if (ivr?.createLeadForUnknown) {
        const assigned = await User.findOne({ status: "Active", role: { $in: ["Admin", "SalesExecutive"] } }).sort({ role: 1 }).select("_id").lean();
        if (assigned) {
          const sourceName = "Inbound call";
          const normalizedSourceName = normalizeValue(sourceName);
          const source = await LeadSource.findOneAndUpdate(
            { sourceName: new RegExp(`^${sourceName}$`, "i") },
            {
              $set: { normalizedSourceName },
              $setOnInsert: { sourceName, channel: "Online", status: "Active" },
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
          );
          const callerName = typeof event.callerName === "string" ? event.callerName.trim().slice(0, 100) : "";
          const lead = await Lead.create({ name: callerName || `Inbound caller ${normalizedFrom.slice(-4)}`, phone: from, source: source._id, assignedEmployee: assigned._id, createdBy: assigned._id, additionalNotes: `Created from inbound telephony call ${providerCallId}` });
          match = { type: "Lead", id: lead._id, name: lead.name, phone: lead.phone, stage: lead.stage, assignedTo: assigned._id };
        }
      }
    }
    const set = {
      direction, from, to, normalizedFrom, normalizedTo, status, startedAt,
      rawStatus: String(event.rawStatus || event.status).slice(0, 80),
      ...(event.answeredAt && !Number.isNaN(new Date(event.answeredAt).getTime()) ? { answeredAt: new Date(event.answeredAt) } : {}),
      ...(event.endedAt && !Number.isNaN(new Date(event.endedAt).getTime()) ? { endedAt: new Date(event.endedAt) } : {}),
      ...(Number.isFinite(Number(event.durationSeconds)) ? { durationSeconds: Math.max(0, Number(event.durationSeconds)) } : {}),
      ...(typeof event.ivrChoice === "string" ? { ivrChoice: event.ivrChoice.slice(0, 10) } : {}),
      ...(typeof event.recordingUrl === "string" && event.recordingUrl.startsWith("https://") ? { recordingUrl: event.recordingUrl } : {}),
      ...(match?.type === "Lead" ? { leadId: match.id } : {}),
      ...(match?.type === "Customer" ? { customerId: match.id } : {}),
    };
    const call = await CallLog.findOneAndUpdate(
      { provider: connection.provider, providerCallId },
      { $set: set, $setOnInsert: { provider: connection.provider, providerCallId } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    if (direction === "inbound" && ["missed", "no-answer", "busy"].includes(status)) {
      const fallbackUser = await User.findOne({ status: "Active", role: { $in: ["Admin", "SalesExecutive"] } })
        .sort({ role: 1 })
        .select("employeeId")
        .populate("employeeId", "_id status")
        .lean();
      const fallbackEmployee = fallbackUser?.employeeId && typeof fallbackUser.employeeId === "object" && fallbackUser.employeeId.status === "Active"
        ? fallbackUser.employeeId._id
        : null;
      const callbackAssignee = match?.assignedTo || fallbackEmployee;
      await FollowUp.findOneAndUpdate(
        { callLogId: call._id },
        { $setOnInsert: {
          callLogId: call._id,
          source: "IVR",
          title: "Missed call callback",
          linkName: match?.name || (typeof event.callerName === "string" ? event.callerName.trim().slice(0, 100) : "") || from,
          phone: from,
          assignedTo: callbackAssignee,
          dueAt: new Date(Date.now() + 15 * 60_000),
          linkedTo: match?.type || "Unknown",
          linkedId: match?.id || null,
          leadId: match?.type === "Lead" ? match.id : null,
          customerId: match?.type === "Customer" ? match.id : null,
          stage: match?.stage || "",
          notes: "Callback missed inbound call",
        } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }
    res.status(202).json({ success: true, data: { callId: call.id } });
  } catch (error) { next(error); }
});

export default router;
