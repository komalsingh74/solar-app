import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import Lead from "../models/lead.js";
import SolarProject from "../models/SolarProject.js";
import SiteSurvey from "../models/siteSurvey.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const statuses = ["Scheduled", "In Progress", "Completed", "Cancelled", "Rescheduled"];
const roofs = ["RCC", "Metal Sheet", "Tiled", "Asbestos", "Ground Mount", "Other"];
const shadows = ["None", "Partial", "Heavy"];
const connections = ["Single phase", "Three phase"];
const dataFields = [
  "phone", "siteAddress", "roofType", "shadowFreeAreaSqFt", "shadowOnRoof", "siteNotes",
  "sanctionedLoadKw", "connection", "averageMonthlyUnitsKwh", "assessmentNotes", "cancelReason",
  "checklist", "photos", "visitTime",
];
const validId = mongoose.isValidObjectId;
const paging = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)),
});

const dateOnly = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new AppError("Enter a valid survey date", 400, "INVALID_DATE");
  return date;
};

const assessSite = (area, units, shadow) => {
  const roofArea = Number(area);
  const monthlyUnits = Number(units);
  if (!roofArea || !monthlyUnits) return { assessmentStatus: "Pending", recommendedCapacityKw: null, assessmentNotes: "" };
  const capacity = Math.max(1, Math.ceil(monthlyUnits / 120));
  const requiredArea = capacity * 100;
  const availableCapacity = Math.floor(roofArea / 100);
  const verdict = shadow === "Heavy" ? "Not feasible"
    : roofArea >= requiredArea ? "Feasible"
      : roofArea >= requiredArea * 0.5 ? "Reduced size" : "Not feasible";
  const recommendedCapacityKw = verdict === "Reduced size" ? Math.max(availableCapacity, 1) : capacity;
  return {
    assessmentStatus: verdict === "Feasible" ? "Completed" : "Needs Review",
    recommendedCapacityKw,
    assessmentNotes: verdict,
  };
};

const prepareSurvey = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  const engineerId = body.engineerId ?? (existing ? String(existing.engineer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) {
    throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  }
  if (!validId(engineerId) || !await User.exists({ _id: engineerId, status: "Active" })) {
    throw new AppError("Select an active engineer", 400, "INVALID_ENGINEER");
  }
  const status = body.status ?? existing?.status ?? "Scheduled";
  if (!statuses.includes(status)) throw new AppError("Choose a valid survey status", 400, "INVALID_STATUS");
  const visitDate = Object.hasOwn(body, "date") ? dateOnly(body.date) : existing?.visitDate;
  if (!visitDate) throw new AppError("Survey date is required", 400, "REQUIRED_FIELDS");
  const visitTime = body.time ?? body.visitTime ?? existing?.visitTime ?? "11:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime)) throw new AppError("Enter a valid survey time", 400, "INVALID_TIME");

  const values = Object.fromEntries(dataFields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
  if (Object.hasOwn(body, "time")) values.visitTime = body.time;
  const phone = body.phone ?? existing?.phone ?? "";
  const siteAddress = body.siteAddress ?? existing?.siteAddress ?? "";
  if (typeof phone !== "string" || !phone.trim()) throw new AppError("Customer phone is required", 400, "REQUIRED_FIELDS");
  if (typeof siteAddress !== "string" || !siteAddress.trim()) throw new AppError("Site address is required", 400, "REQUIRED_FIELDS");
  values.phone = phone.trim();
  values.siteAddress = siteAddress.trim();
  values.customer = customerId;
  values.engineer = engineerId;
  values.visitDate = visitDate;
  values.status = status;
  values.updatedBy = userId;

  if (Object.hasOwn(values, "roofType") && !roofs.includes(values.roofType)) throw new AppError("Choose a valid roof type", 400, "INVALID_ROOF_TYPE");
  if (Object.hasOwn(values, "shadowOnRoof") && !shadows.includes(values.shadowOnRoof)) throw new AppError("Choose a valid shadow level", 400, "INVALID_SHADOW");
  if (Object.hasOwn(values, "connection") && !connections.includes(values.connection)) throw new AppError("Choose a valid connection type", 400, "INVALID_CONNECTION");
  for (const field of ["shadowFreeAreaSqFt", "sanctionedLoadKw", "averageMonthlyUnitsKwh"]) {
    if (Object.hasOwn(values, field) && values[field] !== null && (!Number.isFinite(Number(values[field])) || Number(values[field]) < 0)) {
      throw new AppError("Roof area, load, and monthly units must be non-negative numbers", 400, "INVALID_MEASUREMENT");
    }
    if (Object.hasOwn(values, field) && values[field] === "") values[field] = null;
  }
  if (Object.hasOwn(values, "checklist") && (!values.checklist || typeof values.checklist !== "object" || Array.isArray(values.checklist))) {
    throw new AppError("Survey checklist must be an object", 400, "INVALID_CHECKLIST");
  }
  if (Object.hasOwn(values, "photos")) {
    if (!Array.isArray(values.photos) || values.photos.length > 12) throw new AppError("A survey may contain at most 12 photos", 400, "INVALID_PHOTOS");
    if (values.photos.some((photo) => !photo || typeof photo.id !== "string" || typeof photo.name !== "string" || typeof photo.src !== "string" || !/^data:image\/(?:jpeg|png|webp);base64,/.test(photo.src))) {
      throw new AppError("Survey photos must be valid JPEG, PNG, or WebP data URLs", 400, "INVALID_PHOTOS");
    }
    const totalPhotoCharacters = values.photos.reduce((total, photo) => total + (typeof photo?.src === "string" ? photo.src.length : 0), 0);
    if (totalPhotoCharacters > 10 * 1024 * 1024) throw new AppError("Survey photos exceed the 10 MB limit", 413, "PHOTOS_TOO_LARGE");
  }
  const cancelReason = body.cancelReason ?? existing?.cancelReason ?? "";
  if (status === "Cancelled" && (typeof cancelReason !== "string" || !cancelReason.trim())) {
    throw new AppError("Add a cancellation reason", 400, "CANCEL_REASON_REQUIRED");
  }
  if (status === "Completed") {
    if (!Number(body.shadowFreeAreaSqFt ?? existing?.shadowFreeAreaSqFt)) throw new AppError("Enter shadow-free roof area before completing the survey", 400, "ROOF_AREA_REQUIRED");
    if (!Number(body.averageMonthlyUnitsKwh ?? existing?.averageMonthlyUnitsKwh)) throw new AppError("Enter average monthly units before completing the survey", 400, "MONTHLY_UNITS_REQUIRED");
    if (!((body.photos ?? existing?.photos)?.length)) throw new AppError("Add at least one site photo before completing the survey", 400, "PHOTOS_REQUIRED");
  }
  if (status === "Completed") values.completedAt = existing?.completedAt ?? new Date();
  else if (status !== "In Progress") values.completedAt = null;
  const assessment = assessSite(
    values.shadowFreeAreaSqFt ?? existing?.shadowFreeAreaSqFt,
    values.averageMonthlyUnitsKwh ?? existing?.averageMonthlyUnitsKwh,
    values.shadowOnRoof ?? existing?.shadowOnRoof,
  );
  Object.assign(values, assessment);

  const leadId = Object.hasOwn(body, "leadId") ? body.leadId || "" : existing?.lead ? String(existing.lead) : "";
  if (leadId && (!validId(leadId) || !await Lead.exists({ _id: leadId, isActive: { $ne: false } }))) {
    throw new AppError("Select a valid lead", 400, "INVALID_LEAD");
  }
  values.lead = leadId || null;

  const collision = await SiteSurvey.exists({
    _id: { $ne: existing?._id ?? null },
    engineer: engineerId,
    visitDate,
    visitTime,
    status: { $in: ["Scheduled", "In Progress", "Rescheduled"] },
  });
  if (collision && ["Scheduled", "In Progress", "Rescheduled"].includes(status)) {
    throw new AppError("This engineer already has a survey at that date and time", 409, "ENGINEER_BUSY");
  }
  if (!existing) {
    values.surveyNumber = await nextSequence("site-survey");
    values.createdBy = userId;
    values.activity = [{ text: "Survey scheduled", at: new Date() }];
  } else {
    const changed = status !== existing.status;
    values.activity = [...(changed ? [{ text: `Status changed from ${existing.status} to ${status}`, at: new Date() }] : [{ text: "Survey details updated", at: new Date() }]), ...existing.activity];
  }
  return values;
};

const populateSurvey = (query) => query
  .populate("customer", "customerId customerName phone installationAddress")
  .populate("engineer", "name")
  .populate("lead", "name")
  .populate("project", "projectCode");

export const surveyOptions = asyncHandler(async (_req, res) => {
  const [customers, engineers] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone installationAddress").sort({ customerName: 1 }).lean(),
    User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean(),
  ]);
  res.json({ success: true, data: { customers, engineers } });
});

export const listSiteSurveys = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = {};
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.engineer && validId(req.query.engineer)) filter.engineer = req.query.engineer;
  if (req.query.customer && validId(req.query.customer)) filter.customer = req.query.customer;
  if (req.query.from || req.query.to) {
    filter.visitDate = {};
    if (req.query.from) filter.visitDate.$gte = dateOnly(req.query.from);
    if (req.query.to) filter.visitDate.$lte = dateOnly(req.query.to);
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customers = await Customer.find({ customerName: expression }).distinct("_id");
    filter.$or = [
      { surveyNumber: expression },
      { phone: expression },
      { siteAddress: expression },
      ...(customers.length ? [{ customer: { $in: customers } }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    populateSurvey(SiteSurvey.find(filter).sort({ visitDate: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    SiteSurvey.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createSiteSurvey = asyncHandler(async (req, res) => {
  const item = await SiteSurvey.create(await prepareSurvey(req.body, req.auth.userId, null));
  const populated = await populateSurvey(SiteSurvey.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateSiteSurvey = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid survey ID", 400, "INVALID_ID");
  const item = await SiteSurvey.findById(req.params.id);
  if (!item) throw new AppError("Survey not found", 404, "SURVEY_NOT_FOUND");
  Object.assign(item, await prepareSurvey(req.body, req.auth.userId, item));
  await item.save();
  const populated = await populateSurvey(SiteSurvey.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteSiteSurvey = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid survey ID", 400, "INVALID_ID");
  const item = await SiteSurvey.findById(req.params.id);
  if (!item) throw new AppError("Survey not found", 404, "SURVEY_NOT_FOUND");
  if (await SolarProject.exists({ siteSurvey: item._id, isActive: true })) {
    throw new AppError("Survey is linked to an active solar project and cannot be deleted", 409, "RESOURCE_IN_USE");
  }
  await item.deleteOne();
  res.json({ success: true, data: { id: item._id } });
});
