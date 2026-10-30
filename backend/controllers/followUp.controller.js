import mongoose from "mongoose";
import FollowUpTask from "../models/FollowUpTask.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const types = ["Call", "WhatsApp", "Site visit", "Quotation follow-up", "Payment reminder", "Document collection"];
const priorities = ["High", "Medium", "Low"];
const statuses = ["pending", "completed", "cancelled"];

const prepareTask = (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const fields = ["title", "type", "priority", "linkedTo", "linkName", "phone", "time", "notes"];
  const values = Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
  if (!existing || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) throw new AppError("Task title is required", 400, "REQUIRED_FIELDS");
  }
  if (!existing || Object.hasOwn(body, "linkName")) {
    if (typeof body.linkName !== "string" || !body.linkName.trim()) throw new AppError("Linked record name is required", 400, "REQUIRED_FIELDS");
  }
  if (Object.hasOwn(body, "type") && !types.includes(body.type)) throw new AppError("Choose a valid task type", 400, "INVALID_TYPE");
  if (Object.hasOwn(body, "priority") && !priorities.includes(body.priority)) throw new AppError("Choose a valid priority", 400, "INVALID_PRIORITY");
  if (Object.hasOwn(body, "linkedTo") && !["Lead", "Customer", "Project"].includes(body.linkedTo)) throw new AppError("Choose a valid linked record type", 400, "INVALID_LINK_TYPE");
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
  }
  if (Object.hasOwn(body, "linkedId")) {
    if (body.linkedId && !mongoose.isValidObjectId(body.linkedId)) throw new AppError("Choose a valid linked record", 400, "INVALID_LINKED_ID");
    values.linkedId = body.linkedId || null;
  }
  if (!existing) {
    values.createdBy = userId;
    values.activity = [{ text: "Task created", at: new Date() }];
  }
  values.updatedBy = userId;
  return values;
};

const taskScope = (req) => {
  const filter = {};
  if (!["Admin", "SuperAdmin"].includes(req.auth.role)) {
    filter.$and = [{ $or: [{ assignedTo: req.auth.userId }, { createdBy: req.auth.userId }] }];
  }
  return filter;
};

export const listFollowUpTasks = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
  const filter = taskScope(req);
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  if (["Lead", "Customer", "Project"].includes(req.query.linkedTo)) filter.linkedTo = req.query.linkedTo;
  if (req.query.assignedTo && mongoose.isValidObjectId(req.query.assignedTo)) filter.assignedTo = req.query.assignedTo;
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const escaped = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [
      ...(filter.$and || []),
      { $or: [
      { title: { $regex: escaped, $options: "i" } },
      { linkName: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      ] },
    ];
  }
  const [items, total] = await Promise.all([
    FollowUpTask.find(filter).populate("assignedTo", "name").sort({ dueAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    FollowUpTask.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const followUpOptions = asyncHandler(async (_req, res) => {
  const employees = await User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean();
  res.json({ success: true, data: { employees } });
});

export const createFollowUpTask = asyncHandler(async (req, res) => {
  const item = await FollowUpTask.create(prepareTask(req.body, req.auth.userId, null));
  await item.populate("assignedTo", "name");
  res.status(201).json({ success: true, data: { item } });
});

export const updateFollowUpTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid task ID", 400, "INVALID_ID");
  const item = await FollowUpTask.findOne({ _id: req.params.id, ...taskScope(req) });
  if (!item) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  const values = prepareTask(req.body, req.auth.userId, item);
  if (Object.hasOwn(req.body, "status")) {
    if (!statuses.includes(req.body.status)) throw new AppError("Choose a valid task status", 400, "INVALID_STATUS");
    values.completedAt = req.body.status === "completed" ? new Date() : null;
    values.status = req.body.status;
    const activityText = req.body.status === "completed" ? "Marked done" : req.body.status === "pending" ? "Reopened" : "Cancelled";
    values.activity = [{ text: activityText, at: new Date() }, ...item.activity];
  }
  if (Object.hasOwn(req.body, "dueAt") && item.dueAt.toISOString() !== new Date(req.body.dueAt).toISOString()) {
    values.activity = [{ text: "Task rescheduled", at: new Date() }, ...item.activity];
  }
  Object.assign(item, values);
  await item.save();
  await item.populate("assignedTo", "name");
  res.json({ success: true, data: { item } });
});

export const deleteFollowUpTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid task ID", 400, "INVALID_ID");
  const item = await FollowUpTask.findOneAndDelete({ _id: req.params.id, ...taskScope(req) });
  if (!item) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
