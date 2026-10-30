import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import EquipmentWarranty from "../models/EquipmentWarranty.js";
import SolarProject from "../models/SolarProject.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const populateWarranty = (query) => query
  .populate("customer", "customerId customerName phone")
  .populate("project", "projectCode systemSizeKw");
const asDate = (value) => {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  if (!value || Number.isNaN(date.getTime())) throw new AppError("Enter a valid installation date", 400, "INVALID_DATE");
  return date;
};

const prepareWarranty = async (body, existing) => {
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  const projectId = Object.hasOwn(body, "projectId") ? body.projectId || "" : existing?.project ? String(existing.project) : "";
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, customer: customerId, isActive: true }))) throw new AppError("Select an active project belonging to this customer", 400, "INVALID_PROJECT");
  const itemName = body.itemName ?? existing?.itemName;
  const brand = body.brand ?? existing?.brand;
  const serialNumber = body.serialNumber ?? existing?.serialNumber;
  if (typeof itemName !== "string" || !itemName.trim() || typeof brand !== "string" || !brand.trim() || typeof serialNumber !== "string" || !serialNumber.trim()) throw new AppError("Equipment, brand, and serial number are required", 400, "REQUIRED_FIELDS");
  const installedAt = body.installedAt === undefined ? existing?.installedAt : asDate(body.installedAt);
  if (!installedAt) throw new AppError("Enter a valid installation date", 400, "INVALID_DATE");
  const durationYears = Number(body.durationYears ?? existing?.durationYears);
  if (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 100) throw new AppError("Warranty duration must be between 1 and 100 whole years", 400, "INVALID_DURATION");
  return {
    customer: customerId, project: projectId || null, itemName: itemName.trim(), brand: brand.trim(),
    serialNumber: serialNumber.trim(), installedAt, durationYears,
    provider: typeof body.provider === "string" ? body.provider.trim() : existing?.provider ?? "",
    notes: typeof body.notes === "string" ? body.notes.trim() : existing?.notes ?? "",
  };
};

export const warrantyOptions = asyncHandler(async (_req, res) => {
  const [customers, projects] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone").sort({ customerName: 1 }).lean(),
    SolarProject.find({ isActive: true }).populate("customer", "_id customerName").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { customers, projects } });
});

export const listWarranties = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = { isActive: true };
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customerIds = await Customer.find({ customerName: expression }).distinct("_id");
    const projectIds = await SolarProject.find({ projectCode: expression }).distinct("_id");
    filter.$or = [
      { warrantyNumber: expression }, { itemName: expression }, { brand: expression }, { serialNumber: expression },
      ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
      ...(projectIds.length ? [{ project: { $in: projectIds } }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    populateWarranty(EquipmentWarranty.find(filter).sort({ installedAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    EquipmentWarranty.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createWarranty = asyncHandler(async (req, res) => {
  const values = await prepareWarranty(req.body ?? {}, null);
  const item = await EquipmentWarranty.create({ ...values, warrantyNumber: await nextSequence("WAR"), createdBy: req.auth.userId, updatedBy: req.auth.userId });
  const populated = await populateWarranty(EquipmentWarranty.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateWarranty = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid warranty ID", 400, "INVALID_ID");
  const item = await EquipmentWarranty.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Warranty record not found", 404, "WARRANTY_NOT_FOUND");
  Object.assign(item, await prepareWarranty(req.body ?? {}, item), { updatedBy: req.auth.userId });
  await item.save();
  const populated = await populateWarranty(EquipmentWarranty.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteWarranty = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid warranty ID", 400, "INVALID_ID");
  const item = await EquipmentWarranty.findOneAndUpdate({ _id: req.params.id, isActive: true }, { $set: { isActive: false, updatedBy: req.auth.userId } }, { new: true });
  if (!item) throw new AppError("Warranty record not found", 404, "WARRANTY_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
