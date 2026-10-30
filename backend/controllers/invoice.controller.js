import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import SolarProject from "../models/SolarProject.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const dateValue = (value, label) => {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  if (!value || Number.isNaN(date.getTime())) throw new AppError(`Enter a valid ${label}`, 400, "INVALID_DATE");
  return date;
};
const populated = (query) => query
  .populate("customer", "customerId customerName phone email")
  .populate("project", "projectCode systemSizeKw");

const prepareInvoice = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId) || !await Customer.exists({ _id: customerId, status: "Active" })) throw new AppError("Select an active customer", 400, "INVALID_CUSTOMER");
  const projectId = Object.hasOwn(body, "projectId") ? body.projectId || "" : existing?.project ? String(existing.project) : "";
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, customer: customerId, isActive: true }))) throw new AppError("Select a project belonging to this customer", 400, "INVALID_PROJECT");
  const type = body.type ?? existing?.type ?? "Tax invoice";
  if (!["Tax invoice", "Proforma"].includes(type)) throw new AppError("Choose a valid invoice type", 400, "INVALID_TYPE");
  const taxableAmount = Number(body.taxableAmount ?? existing?.taxableAmount);
  const gstRate = Number(body.gstRate ?? existing?.gstRate);
  if (!Number.isFinite(taxableAmount) || taxableAmount <= 0) throw new AppError("Taxable amount must be greater than zero", 400, "INVALID_AMOUNT");
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) throw new AppError("Enter a valid GST rate", 400, "INVALID_GST");
  const issueDate = body.issueDate === undefined ? existing?.issueDate ?? new Date() : dateValue(body.issueDate, "issue date");
  const dueDate = body.dueDate === undefined ? existing?.dueDate : dateValue(body.dueDate, "due date");
  if (!dueDate || dueDate < issueDate) throw new AppError("Due date must be on or after the issue date", 400, "INVALID_DUE_DATE");
  return {
    customer: customerId, project: projectId || null, type, issueDate, dueDate,
    taxableAmount, gstRate, gstAmount: taxableAmount * gstRate / 100,
    totalAmount: taxableAmount * (1 + gstRate / 100),
    notes: typeof body.notes === "string" ? body.notes : existing?.notes ?? "",
    updatedBy: userId,
    ...(!existing ? { invoiceNumber: await nextSequence("INV"), createdBy: userId } : {}),
  };
};

const includePaidAmounts = async (invoices) => {
  const totals = await Payment.aggregate([
    { $match: { invoice: { $in: invoices.map((invoice) => invoice._id) } } },
    { $group: { _id: "$invoice", amount: { $sum: "$amount" } } },
  ]);
  const paidByInvoice = new Map(totals.map((entry) => [String(entry._id), entry.amount]));
  return invoices.map((invoice) => ({ ...invoice, paidAmount: paidByInvoice.get(String(invoice._id)) ?? 0 }));
};

export const invoiceOptions = asyncHandler(async (_req, res) => {
  const [customers, projects] = await Promise.all([
    Customer.find({ status: "Active" }).select("_id customerName phone").sort({ customerName: 1 }).lean(),
    SolarProject.find({ isActive: true }).populate("customer", "customerName").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { customers, projects } });
});

export const listInvoices = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = { isActive: true };
  if (["Draft", "Sent", "Cancelled"].includes(req.query.status)) filter.status = req.query.status;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const customerIds = await Customer.find({ customerName: expression }).distinct("_id");
    filter.$or = [{ invoiceNumber: expression }, ...(customerIds.length ? [{ customer: { $in: customerIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populated(Invoice.find(filter).sort({ issueDate: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    Invoice.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items: await includePaidAmounts(items), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.create(await prepareInvoice(req.body, req.auth.userId, null));
  const [item] = await includePaidAmounts([await populated(Invoice.findById(invoice._id)).lean()]);
  res.status(201).json({ success: true, data: { item } });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid invoice ID", 400, "INVALID_ID");
  const invoice = await Invoice.findOne({ _id: req.params.id, isActive: true });
  if (!invoice) throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  if (invoice.status !== "Draft" || await Payment.exists({ invoice: invoice._id })) throw new AppError("Only unpaid draft invoices can be edited", 409, "INVOICE_NOT_EDITABLE");
  Object.assign(invoice, await prepareInvoice(req.body, req.auth.userId, invoice));
  await invoice.save();
  const [item] = await includePaidAmounts([await populated(Invoice.findById(invoice._id)).lean()]);
  res.json({ success: true, data: { item } });
});

export const sendInvoice = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid invoice ID", 400, "INVALID_ID");
  const item = await Invoice.findOneAndUpdate(
    { _id: req.params.id, isActive: true, status: "Draft" },
    { $set: { status: "Sent", updatedBy: req.auth.userId } },
    { new: true },
  );
  if (!item) throw new AppError("Only draft invoices can be sent", 409, "INVOICE_NOT_SENDABLE");
  const [result] = await includePaidAmounts([await populated(Invoice.findById(item._id)).lean()]);
  res.json({ success: true, data: { item: result } });
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid invoice ID", 400, "INVALID_ID");
  const invoice = await Invoice.findOne({ _id: req.params.id, isActive: true });
  if (!invoice) throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  if (invoice.status !== "Draft" || await Payment.exists({ invoice: invoice._id })) throw new AppError("Only unpaid draft invoices can be deleted", 409, "INVOICE_NOT_DELETABLE");
  invoice.isActive = false;
  invoice.updatedBy = req.auth.userId;
  await invoice.save();
  res.json({ success: true, data: { id: invoice._id } });
});
