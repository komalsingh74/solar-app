import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import SolarProject from "../models/SolarProject.js";
import SubsidyApplication, { applicationStages } from "../models/SubsidyApplication.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const paging = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const populateApplication = (query) => query
  .populate("customer", "customerId customerName phone")
  .populate("project", "projectCode systemSizeKw")
  .populate("owner", "name");

const prepareApplication = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  const projectId = Object.hasOwn(body, "projectId") ? body.projectId || "" : existing?.project ? String(existing.project) : "";
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, customer: customerId, isActive: true }))) throw new AppError("Select a project belonging to this customer", 400, "INVALID_PROJECT");
  const ownerId = Object.hasOwn(body, "ownerId") ? body.ownerId || "" : existing?.owner ? String(existing.owner) : "";
  if (ownerId && (!validId(ownerId) || !await User.exists({ _id: ownerId, status: "Active" }))) throw new AppError("Select an active application owner", 400, "INVALID_OWNER");
  const systemSizeKw = Number(body.systemSizeKw ?? existing?.systemSizeKw);
  if (!Number.isFinite(systemSizeKw) || systemSizeKw < 0.1) throw new AppError("System size must be at least 0.1 kW", 400, "INVALID_CAPACITY");
  const scheme = body.scheme ?? existing?.scheme ?? "PM Surya Ghar";
  if (!["PM Surya Ghar", "PM-KUSUM", "State subsidy", "No subsidy"].includes(scheme)) throw new AppError("Choose a valid subsidy scheme", 400, "INVALID_SCHEME");
  const stage = body.currentStage ?? existing?.currentStage ?? applicationStages[0];
  if (!applicationStages.includes(stage)) throw new AppError("Choose a valid application stage", 400, "INVALID_STAGE");
  const discom = body.discom ?? existing?.discom ?? "";
  if (typeof discom !== "string" || !discom.trim()) throw new AppError("DISCOM is required", 400, "REQUIRED_FIELDS");
  const expectedSubsidy = Number(body.expectedSubsidy ?? existing?.expectedSubsidy ?? 0);
  if (!Number.isFinite(expectedSubsidy) || expectedSubsidy < 0) throw new AppError("Enter a valid expected subsidy amount", 400, "INVALID_SUBSIDY_AMOUNT");
  const values = {
    customer: customerId, project: projectId || null, owner: ownerId || null,
    systemSizeKw, scheme, discom: discom.trim(),
    portalApplicationNumber: body.portalApplicationNumber ?? existing?.portalApplicationNumber ?? "",
    expectedSubsidy, currentStage: stage,
    notes: body.notes ?? existing?.notes ?? "",
    updatedBy: userId,
  };
  if (!existing || stage !== existing.currentStage) values.stageUpdatedAt = new Date();
  if (!existing) {
    values.applicationNumber = await nextSequence("SUB");
    values.createdBy = userId;
  }
  return values;
};

export const subsidyOptions = asyncHandler(async (_req, res) => {
  const [customers, projects, owners] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone").sort({ customerName: 1 }).lean(),
    SolarProject.find({ isActive: true }).populate("customer", "customerName").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean(),
    User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean(),
  ]);
  res.json({ success: true, data: { customers, projects, owners, stages: applicationStages } });
});

export const listSubsidyApplications = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { isActive: true };
  if (applicationStages.includes(req.query.stage)) filter.currentStage = req.query.stage;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customerIds = await Customer.find({ customerName: expression }).distinct("_id");
    filter.$or = [{ applicationNumber: expression }, { portalApplicationNumber: expression }, { discom: expression }, ...(customerIds.length ? [{ customer: { $in: customerIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populateApplication(SubsidyApplication.find(filter).sort({ stageUpdatedAt: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
    SubsidyApplication.countDocuments(filter),
  ]);
  const now = Date.now();
  const withStageAge = items.map((item) => ({ ...item, daysInStage: Math.max(0, Math.floor((now - new Date(item.stageUpdatedAt).getTime()) / 86400000)) }));
  res.json({ success: true, data: { items: withStageAge, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createSubsidyApplication = asyncHandler(async (req, res) => {
  const item = await SubsidyApplication.create(await prepareApplication(req.body, req.auth.userId, null));
  const populated = await populateApplication(SubsidyApplication.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateSubsidyApplication = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid application ID", 400, "INVALID_ID");
  const item = await SubsidyApplication.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Subsidy application not found", 404, "APPLICATION_NOT_FOUND");
  Object.assign(item, await prepareApplication(req.body, req.auth.userId, item));
  await item.save();
  const populated = await populateApplication(SubsidyApplication.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteSubsidyApplication = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid application ID", 400, "INVALID_ID");
  const item = await SubsidyApplication.findOneAndUpdate({ _id: req.params.id, isActive: true }, { $set: { isActive: false, updatedBy: req.auth.userId } }, { new: true });
  if (!item) throw new AppError("Subsidy application not found", 404, "APPLICATION_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
