import mongoose from "mongoose";
import CallLog from "../models/CallLog.js";
import FollowUp from "../models/FollowUp.js";
import Lead from "../models/lead.js";
import Customer from "../models/customerSchema.js";
import TelephonyConnection from "../models/TelephonyConnection.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { normalizePhone } from "../services/telephony/provider.service.js";

const parseDate = (value, fallback) => { const date = value ? new Date(value) : fallback; return !date || Number.isNaN(date.getTime()) ? null : date; };

export const dashboard = asyncHandler(async (req, res) => {
  const now = new Date(); const start = parseDate(req.query.from, new Date(now.getFullYear(), now.getMonth(), now.getDate())); const end = parseDate(req.query.to, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (!start || !end || start >= end) throw new AppError("Use a valid date range where from is before to", 400, "INVALID_DATE_RANGE");
  const filter = { startedAt: { $gte: start, $lt: end } };
  const [totals, recent, pendingFollowUps, connection] = await Promise.all([
    CallLog.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: 1 }, incoming: { $sum: { $cond: [{ $eq: ["$direction", "inbound"] }, 1, 0] } }, answered: { $sum: { $cond: [{ $in: ["$status", ["answered", "completed"]] }, 1, 0] } }, missed: { $sum: { $cond: [{ $in: ["$status", ["missed", "no-answer", "busy"]] }, 1, 0] } }, durationSeconds: { $sum: "$durationSeconds" } } }]),
    CallLog.find(filter).sort({ startedAt: -1 }).limit(8).lean(),
    FollowUp.countDocuments({ status: "pending", dueAt: { $lt: end } }),
    TelephonyConnection.findOne().select("provider").lean(),
  ]);
  const row = totals[0] || { total: 0, incoming: 0, answered: 0, missed: 0, durationSeconds: 0 };
  const provider = { configured: Boolean(connection), status: connection ? "unverified" : "not_configured", provider: connection?.provider || null, checkedAt: new Date().toISOString() };
  res.json({ success: true, data: { date: start.toISOString(), totals: row, averageTalkSeconds: row.answered ? Math.round(row.durationSeconds / row.answered) : 0, pendingFollowUps, provider, recent } });
});

export const listCalls = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1); const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  const q = String(req.query.q || "").trim();
  if (q) {
    const normalized = normalizePhone(q);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matching = [{ providerCallId: { $regex: safe, $options: "i" } }, { from: { $regex: safe, $options: "i" } }, { to: { $regex: safe, $options: "i" } }];
    if (normalized) matching.push({ normalizedFrom: normalized }, { normalizedTo: normalized });
    filter.$or = matching;
  }
  if (["inbound", "outbound"].includes(req.query.direction)) filter.direction = req.query.direction;
  if (req.query.status === "unanswered") filter.status = { $in: ["missed", "no-answer", "busy"] };
  else if (["ringing", "answered", "missed", "busy", "failed", "completed", "no-answer"].includes(req.query.status)) filter.status = req.query.status;
  const from = parseDate(req.query.from, null); const to = parseDate(req.query.to, null);
  if (req.query.from && !from || req.query.to && !to) throw new AppError("Invalid date filter", 400, "INVALID_DATE");
  if (from || to) filter.startedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  const [items, total] = await Promise.all([CallLog.find(filter).sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), CallLog.countDocuments(filter)]);
  res.json({ success: true, data: { items, page, limit, total, pages: Math.ceil(total / limit) } });
});

export const lookupCaller = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!phone) throw new AppError("Enter a valid caller phone number", 400, "INVALID_PHONE");
  const tail = phone.slice(-10).split("").join("\\D*");
  const [customers, leads] = await Promise.all([
    Customer.find({ phone: { $regex: `${tail}$` } }).select("customerName phone customerId status").limit(5).lean(),
    Lead.find({ phone: { $regex: `${tail}$` }, isActive: true }).select("name phone stage assignedEmployee customerId").limit(5).lean(),
  ]);
  res.json({ success: true, data: { normalizedPhone: phone, matches: [...customers.map((item) => ({ type: "Customer", item })), ...leads.map((item) => ({ type: item.customerId ? "Existing customer lead" : "Lead", item }))] } });
});

export const createFollowUp = asyncHandler(async (req, res) => {
  const { callLogId, dueAt } = req.body || {};
  if (!mongoose.isValidObjectId(callLogId)) throw new AppError("A valid call log ID is required", 400, "INVALID_CALL_ID");
  const call = await CallLog.findById(callLogId);
  if (!call) throw new AppError("Call log not found", 404, "CALL_NOT_FOUND");
  if (call.direction !== "inbound" || !["missed", "no-answer", "busy"].includes(call.status)) throw new AppError("Callback tasks can only be created for unanswered inbound calls", 409, "CALL_NOT_ELIGIBLE");
  const due = dueAt ? new Date(dueAt) : new Date(Date.now() + 15 * 60_000);
  if (Number.isNaN(due.getTime())) throw new AppError("Enter a valid callback due time", 400, "INVALID_DUE_DATE");
  const match = await findPhoneMatch(call.normalizedFrom);
  const values = { phone: call.from, dueAt: due, assignedTo: match?.assignedTo || req.auth.userId, linkedTo: match?.type || "Unknown", linkedId: match?.id || null, notes: "Callback missed inbound call", createdBy: req.auth.userId };
  const existing = await FollowUp.exists({ callLogId: call._id });
  const item = await FollowUp.findOneAndUpdate({ callLogId: call._id }, { $setOnInsert: { callLogId: call._id, ...values } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(existing ? 200 : 201).json({ success: true, data: { item, alreadyExisted: Boolean(existing) } });
});

export const listFollowUps = asyncHandler(async (req, res) => {
  const filter = {};
  if (!["Admin", "SuperAdmin"].includes(req.auth.role)) filter.$or = [{ assignedTo: req.auth.userId }, { createdBy: req.auth.userId }];
  if (["pending", "completed", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
  const items = await FollowUp.find(filter).populate("callLogId", "providerCallId startedAt status ivrChoice").sort({ dueAt: 1 }).limit(100).lean();
  res.json({ success: true, data: { items } });
});

export const setFollowUpStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!["pending", "completed", "cancelled"].includes(status)) throw new AppError("Status must be pending, completed or cancelled", 400, "INVALID_STATUS");
  const filter = { _id: req.params.id };
  if (!["Admin", "SuperAdmin"].includes(req.auth.role)) filter.$or = [{ assignedTo: req.auth.userId }, { createdBy: req.auth.userId }];
  const item = await FollowUp.findOneAndUpdate(filter, { $set: { status, completedAt: status === "completed" ? new Date() : null } }, { new: true, runValidators: true });
  if (!item) throw new AppError("Callback task not found", 404, "FOLLOW_UP_NOT_FOUND");
  res.json({ success: true, data: { item } });
});

export async function findPhoneMatch(normalizedPhone) {
  const tail = normalizedPhone.slice(-10).split("").join("\\D*");
  const customer = await Customer.findOne({ phone: { $regex: `${tail}$` } }).select("_id").lean();
  if (customer) return { type: "Customer", id: customer._id };
  const lead = await Lead.findOne({ phone: { $regex: `${tail}$` }, isActive: true }).sort({ createdAt: -1 }).select("_id customerId assignedEmployee").lean();
  if (lead) return lead.customerId ? { type: "Customer", id: lead.customerId, leadId: lead._id, assignedTo: lead.assignedEmployee } : { type: "Lead", id: lead._id, assignedTo: lead.assignedEmployee };
  return null;
}
