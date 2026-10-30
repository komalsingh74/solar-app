import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import InstallationTeam from "../models/InstallationTeam.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Lead from "../models/lead.js";
import SiteSurvey from "../models/siteSurvey.js";
import SolarProject from "../models/SolarProject.js";
import SubsidyApplication from "../models/SubsidyApplication.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const stages = ["Survey approved", "Material dispatched", "Structure", "Panels mounted", "Wiring & inverter", "Net-meter & inspection", "Commissioned"];
const validId = mongoose.isValidObjectId;
const paging = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const asDate = (value, fallback) => {
  if (value === undefined) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new AppError("Enter a valid project date", 400, "INVALID_DATE");
  return date;
};

const populateProject = (query) => query
  .populate("customer", "customerId customerName phone")
  .populate("lead", "name")
  .populate("siteSurvey", "surveyNumber visitDate")
  .populate("engineer", "name")
  .populate("installationTeam", "teamName");

const prepareProject = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  const leadId = Object.hasOwn(body, "leadId") ? body.leadId || "" : existing?.lead ? String(existing.lead) : "";
  if (leadId && (!validId(leadId) || !await Lead.exists({ _id: leadId, isActive: { $ne: false } }))) throw new AppError("Select a valid lead", 400, "INVALID_LEAD");
  const surveyId = Object.hasOwn(body, "siteSurveyId") ? body.siteSurveyId || "" : existing?.siteSurvey ? String(existing.siteSurvey) : "";
  if (surveyId && (!validId(surveyId) || !await SiteSurvey.exists({ _id: surveyId, customer: customerId }))) throw new AppError("Select a survey belonging to this customer", 400, "INVALID_SURVEY");
  const engineerId = Object.hasOwn(body, "engineerId") ? body.engineerId || "" : existing?.engineer ? String(existing.engineer) : "";
  if (engineerId && (!validId(engineerId) || !await User.exists({ _id: engineerId, status: "Active" }))) throw new AppError("Select an active engineer", 400, "INVALID_ENGINEER");
  const teamId = Object.hasOwn(body, "installationTeamId") ? body.installationTeamId || "" : existing?.installationTeam ? String(existing.installationTeam) : "";
  if (teamId && (!validId(teamId) || !await InstallationTeam.exists({ _id: teamId, isActive: true }))) throw new AppError("Select an active installation team", 400, "INVALID_TEAM");

  const systemSizeKw = Number(body.systemSizeKw ?? existing?.systemSizeKw);
  if (!Number.isFinite(systemSizeKw) || systemSizeKw < 0.1) throw new AppError("System size must be at least 0.1 kW", 400, "INVALID_CAPACITY");
  const stage = body.stage ?? existing?.stage ?? stages[0];
  if (!stages.includes(stage)) throw new AppError("Choose a valid project stage", 400, "INVALID_STAGE");
  const startDate = asDate(body.startDate, existing?.startDate ?? new Date());
  const targetDate = asDate(body.targetDate, existing?.targetDate);
  if (!targetDate || targetDate < startDate) throw new AppError("Target date must be on or after the project start date", 400, "INVALID_TARGET_DATE");

  const netMeteringStatus = body.netMeteringStatus ?? existing?.netMeteringStatus ?? "Not applied";
  const subsidyStatus = body.subsidyStatus ?? existing?.subsidyStatus ?? "Not applicable";
  if (!["Not applied", "Applied", "Approved", "Installed"].includes(netMeteringStatus)) throw new AppError("Choose a valid net-metering status", 400, "INVALID_NET_METERING_STATUS");
  if (!["Not applicable", "Applied", "Approved", "Received"].includes(subsidyStatus)) throw new AppError("Choose a valid subsidy status", 400, "INVALID_SUBSIDY_STATUS");
  const siteAddress = body.siteAddress ?? existing?.siteAddress;
  if (typeof siteAddress !== "string" || !siteAddress.trim()) throw new AppError("Project site address is required", 400, "REQUIRED_FIELDS");

  const values = {
    customer: customerId, lead: leadId || null, siteSurvey: surveyId || null,
    engineer: engineerId || null, installationTeam: teamId || null,
    siteAddress: siteAddress.trim(), systemSizeKw, stage, startDate, targetDate,
    netMeteringStatus, subsidyStatus,
    notes: body.notes ?? existing?.notes ?? "",
    updatedBy: userId,
  };
  if (!existing) {
    values.projectCode = await nextSequence("PRJ");
    values.createdBy = userId;
  }
  return values;
};

export const solarProjectOptions = asyncHandler(async (_req, res) => {
  const [customers, surveys, engineers, teams, leads] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone installationAddress").sort({ customerName: 1 }).lean(),
    SiteSurvey.find({ status: "Completed" }).populate("customer", "customerName").select("_id surveyNumber customer siteAddress recommendedCapacityKw").sort({ visitDate: -1 }).lean(),
    User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean(),
    InstallationTeam.find({ isActive: true }).select("_id teamName").sort({ teamName: 1 }).lean(),
    Lead.find({ isActive: { $ne: false } }).select("_id name stage").sort({ updatedAt: -1 }).limit(200).lean(),
  ]);
  res.json({ success: true, data: { customers, surveys, engineers, teams, leads } });
});

export const listSolarProjects = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { isActive: true };
  if (stages.includes(req.query.stage)) filter.stage = req.query.stage;
  if (req.query.customer && validId(req.query.customer)) filter.customer = req.query.customer;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customerIds = await Customer.find({ customerName: expression }).distinct("_id");
    filter.$or = [{ projectCode: expression }, { siteAddress: expression }, ...(customerIds.length ? [{ customer: { $in: customerIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populateProject(SolarProject.find(filter).sort({ targetDate: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
    SolarProject.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createSolarProject = asyncHandler(async (req, res) => {
  const item = await SolarProject.create(await prepareProject(req.body, req.auth.userId, null));
  const populated = await populateProject(SolarProject.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateSolarProject = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid project ID", 400, "INVALID_ID");
  const item = await SolarProject.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  Object.assign(item, await prepareProject(req.body, req.auth.userId, item));
  await item.save();
  const populated = await populateProject(SolarProject.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteSolarProject = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid project ID", 400, "INVALID_ID");
  const item = await SolarProject.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  const [hasApplications, hasTeam, hasMovements, hasSurvey] = await Promise.all([
    SubsidyApplication.exists({ project: item._id, isActive: true }),
    InstallationTeam.exists({ project: item._id, isActive: true }),
    InventoryMovement.exists({ project: item._id }),
    SiteSurvey.exists({ $or: [{ project: item._id }, { _id: item.siteSurvey }] }),
  ]);
  if (hasApplications || hasTeam || hasMovements || hasSurvey) {
    throw new AppError("Project has linked operations records and cannot be deleted", 409, "RESOURCE_IN_USE");
  }
  item.isActive = false;
  item.updatedBy = req.auth.userId;
  await item.save();
  res.json({ success: true, data: { id: item._id } });
});
