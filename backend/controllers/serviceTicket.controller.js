import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import ServiceTicket from "../models/ServiceTicket.js";
import SolarProject from "../models/SolarProject.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const priorities = ["Critical", "High", "Medium", "Low"];
const categories = ["Low generation", "Inverter error", "Net-meter issue", "Wiring / leakage", "Panel cleaning / AMC", "Billing query"];
const populateTicket = (query) => query
  .populate("customer", "customerId customerName phone")
  .populate("project", "projectCode systemSizeKw")
  .populate("technician", "name phone")
  .populate("activity.by", "name");

const prepareTicket = async (body = {}, existing) => {
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  const projectId = Object.hasOwn(body, "projectId") ? body.projectId || "" : existing?.project ? String(existing.project) : "";
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, customer: customerId, isActive: true }))) throw new AppError("Select an active project belonging to this customer", 400, "INVALID_PROJECT");
  const category = body.category ?? existing?.category;
  if (typeof category !== "string" || !category.trim() || category.length > 100) throw new AppError("Select a complaint category", 400, "INVALID_CATEGORY");
  const priority = body.priority ?? existing?.priority ?? "Medium";
  if (!priorities.includes(priority)) throw new AppError("Choose a valid priority", 400, "INVALID_PRIORITY");
  const warrantyStatus = body.warrantyStatus ?? existing?.warrantyStatus ?? "In warranty";
  if (!["In warranty", "AMC", "Out of warranty"].includes(warrantyStatus)) throw new AppError("Choose a valid coverage status", 400, "INVALID_WARRANTY_STATUS");
  const technicianId = Object.hasOwn(body, "technicianId") ? body.technicianId || "" : existing?.technician ? String(existing.technician) : "";
  if (technicianId && (!validId(technicianId) || !await User.exists({ _id: technicianId, status: "Active", role: { $in: ["ServiceEngineer", "InstallationTeam"] } }))) throw new AppError("Select an active service technician", 400, "INVALID_TECHNICIAN");
  const description = body.description ?? existing?.description;
  if (typeof description !== "string" || !description.trim()) throw new AppError("Describe the complaint", 400, "REQUIRED_FIELDS");
  return {
    customer: customerId, project: projectId || null, category: category.trim(),
    priority, warrantyStatus, technician: technicianId || null, description: description.trim(),
  };
};

export const serviceTicketOptions = asyncHandler(async (_req, res) => {
  const [customers, projects, technicians] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone").sort({ customerName: 1 }).lean(),
    SolarProject.find({ isActive: true }).populate("customer", "_id customerName").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean(),
    User.find({ status: "Active", role: { $in: ["ServiceEngineer", "InstallationTeam"] } }).select("_id name phone").sort({ name: 1 }).lean(),
  ]);
  res.json({ success: true, data: { customers, projects, technicians, categories } });
});

export const listServiceTickets = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = { isActive: true };
  if (["Open", "Assigned", "In progress", "Resolved"].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.priority && priorities.includes(req.query.priority)) filter.priority = req.query.priority;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customerIds = await Customer.find({ customerName: expression }).distinct("_id");
    const projectIds = await SolarProject.find({ projectCode: expression }).distinct("_id");
    filter.$or = [{ ticketNumber: expression }, { category: expression }, { description: expression }, ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []), ...(projectIds.length ? [{ project: { $in: projectIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populateTicket(ServiceTicket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    ServiceTicket.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createServiceTicket = asyncHandler(async (req, res) => {
  const values = await prepareTicket(req.body ?? {}, null);
  const now = new Date();
  const item = await ServiceTicket.create({
    ...values, ticketNumber: await nextSequence("TKT"), status: values.technician ? "Assigned" : "Open",
    activity: [{ action: "Complaint registered", at: now, by: req.auth.userId }],
    createdBy: req.auth.userId, updatedBy: req.auth.userId,
  });
  const populated = await populateTicket(ServiceTicket.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateServiceTicket = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid ticket ID", 400, "INVALID_ID");
  const item = await ServiceTicket.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Complaint not found", 404, "TICKET_NOT_FOUND");
  if (item.status === "Resolved") throw new AppError("Resolved complaints cannot be edited", 409, "TICKET_RESOLVED");
  Object.assign(item, await prepareTicket(req.body, item), { updatedBy: req.auth.userId });
  if (item.technician && item.status === "Open") item.status = "Assigned";
  if (!item.technician && item.status === "Assigned") item.status = "Open";
  item.activity.unshift({ action: "Complaint details updated", by: req.auth.userId });
  await item.save();
  const populated = await populateTicket(ServiceTicket.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const updateServiceTicketStatus = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid ticket ID", 400, "INVALID_ID");
  const item = await ServiceTicket.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Complaint not found", 404, "TICKET_NOT_FOUND");
  const { status, technicianId, resolution } = req.body ?? {};
  if (technicianId !== undefined) {
    if (technicianId && (!validId(technicianId) || !await User.exists({ _id: technicianId, status: "Active", role: { $in: ["ServiceEngineer", "InstallationTeam"] } }))) throw new AppError("Select an active service technician", 400, "INVALID_TECHNICIAN");
    item.technician = technicianId || null;
    if (item.status === "Open" || item.status === "Assigned") item.status = technicianId ? "Assigned" : "Open";
    item.activity.unshift({ action: technicianId ? "Technician assigned" : "Technician unassigned", by: req.auth.userId });
  }
  if (status !== undefined) {
    const transitions = { Open: ["In progress"], Assigned: ["In progress"], "In progress": ["Resolved"] };
    if (!transitions[item.status]?.includes(status)) throw new AppError("This complaint status transition is not allowed", 409, "INVALID_TRANSITION");
    if (status === "In progress" && !item.technician) throw new AppError("Assign a technician before starting work", 409, "TECHNICIAN_REQUIRED");
    if (status === "Resolved" && (typeof resolution !== "string" || !resolution.trim())) throw new AppError("Add a resolution note", 400, "RESOLUTION_REQUIRED");
    item.status = status;
    if (status === "Resolved") {
      item.resolution = resolution.trim();
      item.resolvedAt = new Date();
    }
    item.activity.unshift({ action: status === "Resolved" ? `Resolved: ${item.resolution}` : "Work started", by: req.auth.userId });
  }
  item.updatedBy = req.auth.userId;
  await item.save();
  const populated = await populateTicket(ServiceTicket.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteServiceTicket = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid ticket ID", 400, "INVALID_ID");
  const item = await ServiceTicket.findOneAndUpdate({ _id: req.params.id, isActive: true }, { $set: { isActive: false, updatedBy: req.auth.userId } }, { new: true });
  if (!item) throw new AppError("Complaint not found", 404, "TICKET_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
