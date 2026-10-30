import mongoose from "mongoose";
import Lead from "../models/lead.js";
import LeadSource from "../models/leadSource.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const stages = ["Lead", "Follow-up", "Site Visit", "Site Survey", "Quotation", "Negotiation", "Won", "Lost"];
const customerTypes = ["Residential", "Commercial", "Industrial", "Government", "Mixed"];
const followUpTypes = ["Call", "WhatsApp", "Visit", "Email"];
const priorities = ["Low", "Medium", "High"];
const fields = [
  "name", "phone", "email", "customerType", "location", "stage", "systemSizeKw",
  "monthlyElectricityBill", "roofType", "availableArea", "budget", "financingRequirement",
  "customerRequirement", "additionalNotes", "quotationAmount", "lostReason",
];

const pagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit };
};

const validId = (value) => mongoose.isValidObjectId(value);

const prepareLead = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  }
  const values = Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));

  if (!existing || Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim()) throw new AppError("Lead name is required", 400, "REQUIRED_FIELDS");
  }
  if (!existing || Object.hasOwn(body, "phone")) {
    if (typeof body.phone !== "string" || !body.phone.trim()) throw new AppError("Lead phone is required", 400, "REQUIRED_FIELDS");
  }
  if (Object.hasOwn(body, "customerType") && !customerTypes.includes(body.customerType)) {
    throw new AppError("Choose a valid customer type", 400, "INVALID_CUSTOMER_TYPE");
  }
  if (Object.hasOwn(body, "stage") && !stages.includes(body.stage)) {
    throw new AppError("Choose a valid lead stage", 400, "INVALID_STAGE");
  }

  if (Object.hasOwn(body, "sourceId")) {
    if (body.sourceId && !validId(body.sourceId)) throw new AppError("Choose a valid lead source", 400, "INVALID_SOURCE");
    values.source = body.sourceId || null;
  }
  if (Object.hasOwn(body, "assignedEmployeeId")) {
    if (body.assignedEmployeeId && !validId(body.assignedEmployeeId)) throw new AppError("Choose a valid assignee", 400, "INVALID_ASSIGNEE");
    values.assignedEmployee = body.assignedEmployeeId || null;
  }
  if (Object.hasOwn(body, "nextFollowUp")) {
    const next = body.nextFollowUp;
    if (!next || !next.date) {
      values.nextFollowUp = { date: null, type: "Call", priority: "Medium", reminder: false, notes: "" };
    } else {
      const date = new Date(next.date);
      if (Number.isNaN(date.getTime())) throw new AppError("Enter a valid follow-up date", 400, "INVALID_FOLLOW_UP_DATE");
      if (next.type && !followUpTypes.includes(next.type)) throw new AppError("Choose a valid follow-up type", 400, "INVALID_FOLLOW_UP_TYPE");
      if (next.priority && !priorities.includes(next.priority)) throw new AppError("Choose a valid follow-up priority", 400, "INVALID_PRIORITY");
      values.nextFollowUp = {
        date,
        type: next.type || "Call",
        priority: next.priority || "Medium",
        reminder: Boolean(next.reminder),
        notes: typeof next.notes === "string" ? next.notes : "",
      };
    }
  }
  if (!existing) values.createdBy = userId;
  return values;
};

export const listLeads = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const filter = { isActive: { $ne: false } };
  if (stages.includes(req.query.stage)) filter.stage = req.query.stage;
  if (req.query.source && validId(req.query.source)) filter.source = req.query.source;
  if (req.query.assignedEmployee && validId(req.query.assignedEmployee)) filter.assignedEmployee = req.query.assignedEmployee;

  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(escaped, "i");
    filter.$or = ["name", "phone", "email", "location"].map((field) => ({ [field]: expression }));
  }
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if (req.query.from && Number.isNaN(from.getTime()) || req.query.to && Number.isNaN(to.getTime())) {
    throw new AppError("Enter a valid date range", 400, "INVALID_DATE");
  }
  if (from || to) {
    filter["nextFollowUp.date"] = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const [items, total] = await Promise.all([
    Lead.find(filter).populate("source", "sourceName").populate("assignedEmployee", "name").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const leadOptions = asyncHandler(async (_req, res) => {
  const [sources, employees] = await Promise.all([
    LeadSource.find({ status: "Active" }).select("_id sourceName").sort({ sourceName: 1 }).lean(),
    User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean(),
  ]);
  res.json({ success: true, data: { sources, employees } });
});

export const createLead = asyncHandler(async (req, res) => {
  const values = await prepareLead(req.body, req.auth.userId, null);
  const item = await Lead.create(values);
  await item.populate([{ path: "source", select: "sourceName" }, { path: "assignedEmployee", select: "name" }]);
  res.status(201).json({ success: true, data: { item } });
});

export const updateLead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid lead ID", 400, "INVALID_ID");
  const item = await Lead.findOne({ _id: req.params.id, isActive: { $ne: false } });
  if (!item) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
  Object.assign(item, await prepareLead(req.body, req.auth.userId, item), { updatedAt: new Date() });
  await item.save();
  await item.populate([{ path: "source", select: "sourceName" }, { path: "assignedEmployee", select: "name" }]);
  res.json({ success: true, data: { item } });
});

export const deleteLead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid lead ID", 400, "INVALID_ID");
  const item = await Lead.findOneAndUpdate(
    { _id: req.params.id, isActive: { $ne: false } },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!item) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
