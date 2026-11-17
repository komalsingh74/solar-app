import mongoose from "mongoose";
import FollowUp from "../models/FollowUp.js";
import FollowUpTask from "../models/FollowUpTask.js";
import Employee from "../models/hrms/Employee.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const types = ["Call", "WhatsApp", "Visit", "Email", "Task", "Site visit", "Quotation follow-up", "Payment reminder", "Document collection"];
const priorities = ["High", "Medium", "Low"];
const statuses = ["pending", "completed", "cancelled"];

const prepareTask = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const fields = ["title", "type", "priority", "linkedTo", "linkName", "phone", "time", "notes", "stage", "reminder", "source"];
  const values = Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
  if (!existing || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) throw new AppError("Task title is required", 400, "REQUIRED_FIELDS");
  }
  if (!existing || Object.hasOwn(body, "linkName")) {
    if (typeof body.linkName !== "string" || !body.linkName.trim()) throw new AppError("Linked record name is required", 400, "REQUIRED_FIELDS");
  }
  if (Object.hasOwn(body, "type") && !types.includes(body.type)) throw new AppError("Choose a valid task type", 400, "INVALID_TYPE");
  if (Object.hasOwn(body, "priority") && !priorities.includes(body.priority)) throw new AppError("Choose a valid priority", 400, "INVALID_PRIORITY");
  if (Object.hasOwn(body, "linkedTo") && !["Lead", "Customer", "Project", "IVR"].includes(body.linkedTo)) throw new AppError("Choose a valid linked record type", 400, "INVALID_LINK_TYPE");
  if (Object.hasOwn(body, "source") && !["Lead", "Customer", "IVR", "Manual"].includes(body.source)) throw new AppError("Choose a valid follow-up source", 400, "INVALID_SOURCE");
  if (Object.hasOwn(body, "reminder") && typeof body.reminder !== "boolean") throw new AppError("Reminder must be a boolean", 400, "INVALID_REMINDER");
  if (Object.hasOwn(body, "stage") && typeof body.stage !== "string") throw new AppError("Choose a valid task stage", 400, "INVALID_STAGE");
  if (Object.hasOwn(body, "dueAt")) {
    const dueAt = new Date(body.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw new AppError("Enter a valid task due date", 400, "INVALID_DUE_DATE");
    values.dueAt = dueAt;
  } else if (!existing) {
    throw new AppError("Task due date is required", 400, "REQUIRED_FIELDS");
  }
  if (Object.hasOwn(body, "assignedTo")) {
    if (body.assignedTo && !mongoose.isValidObjectId(body.assignedTo)) throw new AppError("Choose a valid assignee", 400, "INVALID_ASSIGNEE");
    values.assignedTo = body.assignedTo || null;
    values.assignedToUserId = null;
    if (body.assignedTo && !await Employee.exists({ _id: body.assignedTo, status: "Active" })) {
      throw new AppError("Choose an active employee", 400, "INVALID_ASSIGNEE");
    }
  }
  if (Object.hasOwn(body, "linkedId")) {
    if (body.linkedId && !mongoose.isValidObjectId(body.linkedId)) throw new AppError("Choose a valid linked record", 400, "INVALID_LINKED_ID");
    values.linkedId = body.linkedId || null;
  }
  if (Object.hasOwn(body, "status") && !statuses.includes(body.status)) throw new AppError("Choose a valid task status", 400, "INVALID_STATUS");
  if (!existing) {
    values.createdBy = userId;
    values.activity = [{ text: "Task created", at: new Date() }];
  }
  values.updatedBy = userId;
  return values;
};

const taskScope = (req, employeeId) => {
  const filter = {};
  if (!["Admin", "SuperAdmin"].includes(req.auth.role)) {
    filter.$and = [{
      $or: [
        ...(employeeId ? [{ assignedTo: employeeId }] : []),
        { assignedTo: req.auth.userId },
        { assignedToUserId: req.auth.userId },
        { createdBy: req.auth.userId },
      ],
    }];
  }
  return filter;
};

const addTaskFilters = (filter, query) => {
  if (statuses.includes(query.status)) filter.status = query.status;
  if (["Lead", "Customer", "Project"].includes(query.linkedTo)) filter.linkedTo = query.linkedTo;
  if (query.assignedTo && mongoose.isValidObjectId(query.assignedTo)) filter.assignedTo = query.assignedTo;
  if (typeof query.q === "string" && query.q.trim()) {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [
      ...(filter.$and || []),
      { $or: [
        { title: { $regex: escaped, $options: "i" } },
        { linkName: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ] },
    ];
  }
};

export const listFollowUpTasks = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
  const offset = (page - 1) * limit;
  const currentUser = await User.findById(req.auth.userId).select("employeeId").lean();
  const followUpFilter = taskScope(req, currentUser?.employeeId);
  const legacyFilter = taskScope(req, currentUser?.employeeId);
  addTaskFilters(followUpFilter, req.query);
  addTaskFilters(legacyFilter, req.query);
  const take = offset + limit;
  const [followUps, legacyTasks, followUpCount, legacyCount] = await Promise.all([
    FollowUp.find(followUpFilter)
      .populate("assignedTo", "fullName employeeCode designation systemRole")
      .populate("assignedToUserId", "name")
      .populate("leadId", "name phone stage")
      .populate("customerId", "customerName phone")
      .sort({ dueAt: 1, _id: 1 })
      .limit(take)
      .lean(),
    FollowUpTask.find(legacyFilter)
      .populate("assignedTo", "fullName employeeCode designation systemRole")
      .populate("assignedToUserId", "name")
      .sort({ dueAt: 1, _id: 1 }).limit(take).lean(),
    FollowUp.countDocuments(followUpFilter),
    FollowUpTask.countDocuments(legacyFilter),
  ]);
  const items = [...followUps, ...legacyTasks]
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || String(a._id).localeCompare(String(b._id)))
    .slice(offset, offset + limit);
  res.json({ success: true, data: { items, pagination: { page, limit, total: followUpCount + legacyCount, pages: Math.ceil((followUpCount + legacyCount) / limit) } } });
});

export const followUpOptions = asyncHandler(async (_req, res) => {
  const employees = await Employee.find({ status: "Active" })
    .select("_id fullName employeeCode designation department systemRole")
    .sort({ fullName: 1 })
    .lean();
  res.json({ success: true, data: { employees } });
});

const toFollowUp = (values) => ({
  ...values,
  source: values.source === "IVR" || values.linkedTo === "IVR" ? "IVR" : values.linkedTo === "Lead" ? "Lead" : values.linkedTo === "Customer" ? "Customer" : "Manual",
  leadId: values.linkedTo === "Lead" ? values.linkedId : null,
  customerId: values.linkedTo === "Customer" ? values.linkedId : null,
});

export const createFollowUpTask = asyncHandler(async (req, res) => {
  const values = await prepareTask(req.body, req.auth.userId, null);
  const item = await FollowUp.create(toFollowUp(values));
  await item.populate("assignedTo", "fullName employeeCode designation systemRole");
  res.status(201).json({ success: true, data: { item } });
});

export const updateFollowUpTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid task ID", 400, "INVALID_ID");
  const currentUser = await User.findById(req.auth.userId).select("employeeId").lean();
  const filter = { _id: req.params.id, ...taskScope(req, currentUser?.employeeId) };
  const followUp = await FollowUp.findOne(filter);
  if (followUp) {
    const values = await prepareTask(req.body, req.auth.userId, followUp);
    const mapped = toFollowUp(values);
    if (req.body.source === "IVR") {
      delete mapped.leadId;
      delete mapped.customerId;
      delete mapped.linkedTo;
      delete mapped.linkedId;
    }
    if (!Object.hasOwn(values, "linkedTo")) {
      delete mapped.source;
      delete mapped.leadId;
      delete mapped.customerId;
    }
    if (Object.hasOwn(req.body, "status")) {
      mapped.status = req.body.status;
      mapped.completedAt = req.body.status === "completed" ? new Date() : null;
      mapped.activity = [{ text: req.body.status === "completed" ? "Marked done" : req.body.status === "pending" ? "Reopened" : "Cancelled", at: new Date() }, ...followUp.activity];
    }
    if (Object.hasOwn(req.body, "dueAt") && followUp.dueAt.toISOString() !== new Date(req.body.dueAt).toISOString()) {
      mapped.activity = [{ text: "Task rescheduled", at: new Date() }, ...followUp.activity];
    }
    Object.assign(followUp, mapped);
    await followUp.save();
    await followUp.populate("assignedTo", "fullName employeeCode designation systemRole");
    await followUp.populate("assignedToUserId", "name");
    await followUp.populate("leadId", "name phone stage");
    await followUp.populate("customerId", "customerName phone");
    return res.json({ success: true, data: { item: followUp } });
  }

  const legacy = await FollowUpTask.findOne(filter);
  if (!legacy) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  const values = await prepareTask(req.body, req.auth.userId, legacy);
  if (Object.hasOwn(req.body, "status")) {
    values.status = req.body.status;
    values.completedAt = req.body.status === "completed" ? new Date() : null;
    values.activity = [{ text: req.body.status === "completed" ? "Marked done" : req.body.status === "pending" ? "Reopened" : "Cancelled", at: new Date() }, ...legacy.activity];
  }
  if (Object.hasOwn(req.body, "dueAt") && legacy.dueAt.toISOString() !== new Date(req.body.dueAt).toISOString()) {
    values.activity = [{ text: "Task rescheduled", at: new Date() }, ...legacy.activity];
  }
  Object.assign(legacy, values);
  await legacy.save();
  await legacy.populate("assignedTo", "fullName employeeCode designation systemRole");
  await legacy.populate("assignedToUserId", "name");
  res.json({ success: true, data: { item: legacy } });
});

export const deleteFollowUpTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid task ID", 400, "INVALID_ID");
  const currentUser = await User.findById(req.auth.userId).select("employeeId").lean();
  const filter = { _id: req.params.id, ...taskScope(req, currentUser?.employeeId) };
  const followUp = await FollowUp.findOne(filter);
  if (followUp) {
    if (followUp.source === "Lead") throw new AppError("Lead follow-up history cannot be deleted", 409, "LEAD_FOLLOW_UP_HISTORY");
    await followUp.deleteOne();
    return res.json({ success: true, data: { id: followUp._id } });
  }
  const item = await FollowUpTask.findOneAndDelete(filter);
  if (!item) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
