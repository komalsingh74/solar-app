import mongoose from "mongoose";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import Category from "../models/categorySchema.js";
import Expense from "../models/Expense.js";
import SolarProject from "../models/SolarProject.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const populateExpense = (query) => query
  .populate("category", "categoryName group")
  .populate("project", "projectCode systemSizeKw")
  .populate("createdBy", "name");

export const expenseOptions = asyncHandler(async (_req, res) => {
  const [categories, projects] = await Promise.all([
    Category.find({ status: "Active", group: { $regex: /^expense$/i } }).select("_id categoryName monthlyBudget receiptRequired").sort({ categoryName: 1 }).lean(),
    SolarProject.find({ isActive: true }).populate("customer", "customerName").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { categories, projects } });
});

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = {};
  if (["pending", "approved", "paid", "rejected"].includes(req.query.status)) filter.status = req.query.status;
  if (validId(req.query.category)) filter.category = req.query.category;
  if (validId(req.query.project)) filter.project = req.query.project;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const categoryIds = await Category.find({ categoryName: expression }).distinct("_id");
    const projectIds = await SolarProject.find({ projectCode: expression }).distinct("_id");
    filter.$or = [{ expenseNumber: expression }, { title: expression }, { paidTo: expression }, ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []), ...(projectIds.length ? [{ project: { $in: projectIds } }] : [])];
  }
  const [items, total] = await Promise.all([
    populateExpense(Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    Expense.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createExpense = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.title !== "string" || !body.title.trim()) throw new AppError("Expense title is required", 400, "REQUIRED_FIELDS");
  if (!validId(body.categoryId) || !await Category.exists({ _id: body.categoryId, status: "Active", group: { $regex: /^expense$/i } })) throw new AppError("Select an active expense category", 400, "INVALID_CATEGORY");
  if (body.projectId && (!validId(body.projectId) || !await SolarProject.exists({ _id: body.projectId, isActive: true }))) throw new AppError("Select an active solar project", 400, "INVALID_PROJECT");
  const amount = Number(body.amount);
  const expenseDate = typeof body.expenseDate === "string" ? new Date(body.expenseDate) : new Date(Number.NaN);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("Expense amount must be greater than zero", 400, "INVALID_AMOUNT");
  if (Number.isNaN(expenseDate.getTime())) throw new AppError("Enter a valid expense date", 400, "INVALID_DATE");
  if (!["Cash", "UPI", "Bank transfer", "Cheque"].includes(body.paymentMode)) throw new AppError("Choose a valid payment mode", 400, "INVALID_MODE");
  const item = await Expense.create({
    expenseNumber: await nextSequence("EXP"), title: body.title.trim(), expenseDate,
    category: body.categoryId, paidTo: typeof body.paidTo === "string" ? body.paidTo.trim() : "",
    paymentMode: body.paymentMode, project: body.projectId || null, amount, status: "pending",
    receipt: body.receipt && typeof body.receipt === "object" ? body.receipt : {},
    createdBy: req.auth.userId, updatedBy: req.auth.userId,
  });
  const populated = await populateExpense(Expense.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateExpenseStatus = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid expense ID", 400, "INVALID_ID");
  const { status } = req.body ?? {};
  const transitions = { pending: ["approved", "rejected"], approved: ["paid"] };
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new AppError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  if (!transitions[expense.status]?.includes(status)) throw new AppError("This expense status transition is not allowed", 409, "INVALID_TRANSITION");
  expense.status = status;
  expense.updatedBy = req.auth.userId;
  await expense.save();
  const populated = await populateExpense(Expense.findById(expense._id));
  res.json({ success: true, data: { item: populated } });
});

export const uploadExpenseReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("Select an image or PDF receipt", 400, "FILE_REQUIRED");
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "solar-panel-management/finance-expenses", resource_type: "auto" },
      (error, uploaded) => error ? reject(error) : resolve(uploaded),
    );
    Readable.from(req.file.buffer).pipe(stream);
  });
  res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, name: req.file.originalname } });
});
