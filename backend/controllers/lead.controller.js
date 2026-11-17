import mongoose from "mongoose";
import Lead from "../models/lead.js";
import FollowUp from "../models/FollowUp.js";
import Employee from "../models/hrms/Employee.js";
import LeadSource from "../models/leadSource.js";
import nextSequence from "../services/nextSequence.js";
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
    values.assignedEmployeeUserId = null;
    if (body.assignedEmployeeId && !await Employee.exists({ _id: body.assignedEmployeeId, status: "Active" })) {
      throw new AppError("Choose an active employee", 400, "INVALID_ASSIGNEE");
    }
  }
  if (!existing) values.createdBy = userId;
  values.updatedBy = userId;
  return values;
};

const prepareLeadFollowUp = async (body, lead, userId) => {
  if (!Object.hasOwn(body, "nextFollowUp")) return { scheduled: false, stage: body.stage || lead.stage };
  const next = body.nextFollowUp;
  if (next == null) return { scheduled: false, stage: body.stage || lead.stage };
  if (typeof next !== "object" || Array.isArray(next)) {
    throw new AppError("Follow-up details must be an object", 400, "INVALID_FOLLOW_UP");
  }
  if (!next.date) return { scheduled: false, stage: body.stage || lead.stage };
  const dueAt = new Date(next.date);
  if (Number.isNaN(dueAt.getTime())) throw new AppError("Enter a valid follow-up date", 400, "INVALID_FOLLOW_UP_DATE");
  if (next.type && !followUpTypes.includes(next.type)) throw new AppError("Choose a valid follow-up type", 400, "INVALID_FOLLOW_UP_TYPE");
  if (next.priority && !priorities.includes(next.priority)) throw new AppError("Choose a valid follow-up priority", 400, "INVALID_PRIORITY");
  const hasAssignedTo = Object.hasOwn(next, "assignedTo") || Object.hasOwn(body, "assignedEmployeeId");
  const assignedTo = Object.hasOwn(next, "assignedTo")
    ? next.assignedTo
    : (Object.hasOwn(body, "assignedEmployeeId") ? body.assignedEmployeeId : lead.assignedEmployee);
  if (assignedTo && !validId(assignedTo)) throw new AppError("Choose a valid follow-up assignee", 400, "INVALID_ASSIGNEE");
  if (assignedTo && hasAssignedTo && !await Employee.exists({ _id: assignedTo, status: "Active" })) {
    throw new AppError("Choose an active follow-up assignee", 400, "INVALID_ASSIGNEE");
  }
  const stage = next.stage || body.stage || lead.stage;
  if (!stages.includes(stage)) throw new AppError("Choose a valid follow-up stage", 400, "INVALID_STAGE");
  return {
    scheduled: true,
    values: {
      source: "Lead",
      leadId: lead._id,
      linkedTo: "Lead",
      linkedId: lead._id,
      linkName: lead.name,
      title: `Follow-up: ${lead.name}`,
      phone: lead.phone,
      assignedTo: assignedTo || null,
      ...(Object.hasOwn(next, "assignedTo") || Object.hasOwn(body, "assignedEmployeeId") ? { assignedToUserId: null } : {}),
      stage,
      dueAt,
      type: next.type || "Call",
      priority: next.priority || "Medium",
      reminder: Boolean(next.reminder),
      notes: typeof next.notes === "string" ? next.notes : "",
      status: "pending",
      updatedBy: userId,
    },
  };
};

const pendingLeadFollowUps = async (leadIds) => {
  if (!leadIds.length) return new Map();
  const items = await FollowUp.find({ leadId: { $in: leadIds }, status: "pending" })
    .sort({ dueAt: 1 })
    .lean();
  const byLead = new Map();
  for (const item of items) {
    const key = String(item.leadId);
    if (!byLead.has(key)) {
      byLead.set(key, {
        date: item.dueAt,
        type: item.type,
        priority: item.priority,
        reminder: item.reminder,
        notes: item.notes,
        stage: item.stage,
        followUpId: item._id,
      });
    }
  }
  return byLead;
};

const addPendingFollowUps = async (items) => {
  const followUps = await pendingLeadFollowUps(items.map((item) => item._id));
  return items.map((item) => ({
    ...item,
    nextFollowUp: followUps.get(String(item._id)) || null,
  }));
};

const saveLeadFollowUp = async (lead, followUp, userId) => {
  if (!followUp) return;
  const pending = await FollowUp.findOne({ leadId: lead._id, status: "pending" }).sort({ dueAt: -1 });
  if (followUp.scheduled) {
    if (pending) {
      Object.assign(pending, followUp.values);
      await pending.save();
    } else {
      await FollowUp.create({ ...followUp.values, createdBy: userId });
    }
  } else if (pending) {
    pending.stage = followUp.stage || lead.stage;
    pending.linkName = lead.name;
    pending.title = `Follow-up: ${lead.name}`;
    pending.phone = lead.phone;
    pending.assignedTo = lead.assignedEmployee || null;
    pending.updatedBy = userId;
    await pending.save();
  }
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
    const dueAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const leadIds = await FollowUp.distinct("leadId", { status: "pending", leadId: { $ne: null }, dueAt });
    filter._id = { $in: leadIds };
  }

  const [items, total] = await Promise.all([
    Lead.find(filter).populate("source", "sourceName")
      .populate("assignedEmployee", "fullName employeeCode designation systemRole")
      .populate("assignedEmployeeUserId", "name")
      .sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items: await addPendingFollowUps(items), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const leadOptions = asyncHandler(async (_req, res) => {
  const [sources, employees] = await Promise.all([
    LeadSource.find({ status: "Active" }).select("_id sourceName").sort({ sourceName: 1 }).lean(),
    Employee.find({ status: "Active" }).select("_id fullName employeeCode designation department systemRole").sort({ fullName: 1 }).lean(),
  ]);
  res.json({ success: true, data: { sources, employees } });
});

export const createLead = asyncHandler(async (req, res) => {
  const values = await prepareLead(req.body, req.auth.userId, null);
  const followUpInput = await prepareLeadFollowUp(req.body, values, req.auth.userId);
  values.leadCode = await nextSequence("LEAD");
  const item = await Lead.create(values);
  if (followUpInput?.scheduled) {
    Object.assign(followUpInput.values, {
      leadId: item._id,
      linkedId: item._id,
      linkName: item.name,
      title: `Follow-up: ${item.name}`,
      phone: item.phone,
    });
  }
  await saveLeadFollowUp(item, followUpInput, req.auth.userId);
  await item.populate([
    { path: "source", select: "sourceName" },
    { path: "assignedEmployee", select: "fullName employeeCode designation systemRole" },
    { path: "assignedEmployeeUserId", select: "name" },
  ]);
  const [withFollowUp] = await addPendingFollowUps([item.toObject()]);
  res.status(201).json({ success: true, data: { item: withFollowUp } });
});

export const updateLead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid lead ID", 400, "INVALID_ID");
  const item = await Lead.findOne({ _id: req.params.id, isActive: { $ne: false } });
  if (!item) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
  const values = await prepareLead(req.body, req.auth.userId, item);
  const followUpInput = await prepareLeadFollowUp(req.body, { ...item.toObject(), ...values }, req.auth.userId);
  // Older CRM records predate lead codes; assign one when first edited.
  if (!item.leadCode) item.leadCode = await nextSequence("LEAD");
  Object.assign(item, values, { updatedAt: new Date() });
  await item.save();
  await saveLeadFollowUp(item, followUpInput, req.auth.userId);
  await item.populate([
    { path: "source", select: "sourceName" },
    { path: "assignedEmployee", select: "fullName employeeCode designation systemRole" },
    { path: "assignedEmployeeUserId", select: "name" },
  ]);
  const [withFollowUp] = await addPendingFollowUps([item.toObject()]);
  res.json({ success: true, data: { item: withFollowUp } });
});

export const deleteLead = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid lead ID", 400, "INVALID_ID");
  const item = await Lead.findOneAndUpdate(
    { _id: req.params.id, isActive: { $ne: false } },
    { $set: { isActive: false } },
    { returnDocument: "after" },
  );
  if (!item) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
