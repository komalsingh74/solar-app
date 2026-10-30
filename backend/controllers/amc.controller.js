import mongoose from "mongoose";
import AmcContract from "../models/AmcContract.js";
import SolarProject from "../models/SolarProject.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const populateContract = (query) => query
  .populate("customer", "customerId customerName phone")
  .populate("project", "projectCode systemSizeKw")
  .populate("visits.completedBy", "name");
const asDate = (value, label) => {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  if (!value || Number.isNaN(date.getTime())) throw new AppError(`Enter a valid ${label}`, 400, "INVALID_DATE");
  return date;
};

const prepareContract = async (body, existing) => {
  const projectId = body.projectId ?? (existing ? String(existing.project) : "");
  const project = validId(projectId) ? await SolarProject.findOne({ _id: projectId, isActive: true }) : null;
  if (!project) throw new AppError("Select an active solar project", 400, "INVALID_PROJECT");
  const plan = body.plan ?? existing?.plan;
  if (typeof plan !== "string" || !plan.trim()) throw new AppError("Enter an AMC plan", 400, "INVALID_PLAN");
  const annualVisitAllowance = Number(body.annualVisitAllowance ?? existing?.annualVisitAllowance);
  if (!Number.isInteger(annualVisitAllowance) || annualVisitAllowance < 1 || annualVisitAllowance > 365) throw new AppError("Annual visits must be between 1 and 365", 400, "INVALID_VISITS");
  const startDate = body.startDate === undefined ? existing?.startDate : asDate(body.startDate, "start date");
  const endDate = body.endDate === undefined ? existing?.endDate : asDate(body.endDate, "end date");
  if (!startDate || !endDate || endDate < startDate) throw new AppError("End date must be on or after the start date", 400, "INVALID_CONTRACT_DATES");
  const annualFee = Number(body.annualFee ?? existing?.annualFee);
  if (!Number.isFinite(annualFee) || annualFee < 0) throw new AppError("Annual fee cannot be negative", 400, "INVALID_FEE");
  if (existing && existing.visits.length > annualVisitAllowance) throw new AppError("Visit allowance cannot be lower than visits already completed", 409, "VISIT_ALLOWANCE_BELOW_USED");
  return { customer: project.customer, project: project._id, plan: plan.trim(), annualVisitAllowance, startDate, endDate, annualFee };
};

export const amcOptions = asyncHandler(async (_req, res) => {
  const projects = await SolarProject.find({ isActive: true })
    .populate("customer", "_id customerName phone")
    .select("_id projectCode customer systemSizeKw")
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { projects } });
});

export const listAmcContracts = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = { isActive: true };
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const projectIds = await SolarProject.find({ projectCode: expression }).distinct("_id");
    filter.$or = [{ contractNumber: expression }, { plan: expression }, ...(projectIds.length ? [{ project: { $in: projectIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populateContract(AmcContract.find(filter).sort({ endDate: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
    AmcContract.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createAmcContract = asyncHandler(async (req, res) => {
  const values = await prepareContract(req.body ?? {}, null);
  const item = await AmcContract.create({ ...values, contractNumber: await nextSequence("AMC"), createdBy: req.auth.userId, updatedBy: req.auth.userId });
  const populated = await populateContract(AmcContract.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateAmcContract = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid AMC contract ID", 400, "INVALID_ID");
  const item = await AmcContract.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("AMC contract not found", 404, "AMC_NOT_FOUND");
  Object.assign(item, await prepareContract(req.body ?? {}, item), { updatedBy: req.auth.userId });
  await item.save();
  const populated = await populateContract(AmcContract.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const logAmcVisit = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid AMC contract ID", 400, "INVALID_ID");
  const item = await AmcContract.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("AMC contract not found", 404, "AMC_NOT_FOUND");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (item.endDate < today) throw new AppError("Expired AMC contracts cannot record visits", 409, "AMC_EXPIRED");
  if (item.visits.length >= item.annualVisitAllowance) throw new AppError("All visits in this contract have been used", 409, "VISITS_EXHAUSTED");
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
  item.visits.push({ notes, completedBy: req.auth.userId });
  item.updatedBy = req.auth.userId;
  await item.save();
  const populated = await populateContract(AmcContract.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const renewAmcContract = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid AMC contract ID", 400, "INVALID_ID");
  const previous = await AmcContract.findOne({ _id: req.params.id, isActive: true });
  if (!previous) throw new AppError("AMC contract not found", 404, "AMC_NOT_FOUND");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayAfterEnd = new Date(previous.endDate);
  dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1);
  const startDate = req.body?.startDate ? asDate(req.body.startDate, "start date") : dayAfterEnd > today ? dayAfterEnd : today;
  const endDate = req.body?.endDate ? asDate(req.body.endDate, "end date") : new Date(startDate);
  if (!req.body?.endDate) endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
  if (endDate < startDate) throw new AppError("End date must be on or after the start date", 400, "INVALID_CONTRACT_DATES");
  const annualFee = req.body?.annualFee === undefined ? previous.annualFee : Number(req.body.annualFee);
  if (!Number.isFinite(annualFee) || annualFee < 0) throw new AppError("Annual fee cannot be negative", 400, "INVALID_FEE");
  const item = await AmcContract.create({
    contractNumber: await nextSequence("AMC"), customer: previous.customer, project: previous.project,
    plan: previous.plan, annualVisitAllowance: previous.annualVisitAllowance, startDate, endDate, annualFee,
    renewedFrom: previous._id, createdBy: req.auth.userId, updatedBy: req.auth.userId,
  });
  const populated = await populateContract(AmcContract.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const deleteAmcContract = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid AMC contract ID", 400, "INVALID_ID");
  const item = await AmcContract.findOneAndUpdate({ _id: req.params.id, isActive: true }, { $set: { isActive: false, updatedBy: req.auth.userId } }, { new: true });
  if (!item) throw new AppError("AMC contract not found", 404, "AMC_NOT_FOUND");
  res.json({ success: true, data: { id: item._id } });
});
