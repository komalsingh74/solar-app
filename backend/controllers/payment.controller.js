import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import PaymentPlan from "../models/PaymentPlan.js";
import Quotation from "../models/quotation.js";
import SolarProject from "../models/SolarProject.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";

const validId = mongoose.isValidObjectId;
const pageParams = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const planTypes = ["Cash", "Milestone", "Kisht", "Finance"];
const modes = ["UPI", "Bank transfer", "Cheque", "Cash", "Subsidy (DBT)", "Loan disbursement"];
const populatePayment = (query) => query
  .populate("customer", "customerName phone")
  .populate("project", "projectCode systemSizeKw")
  .populate("invoice", "invoiceNumber");

export const listPaymentAccounts = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const projects = await SolarProject.find({ isActive: true })
    .populate("customer", "customerName phone")
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  const projectIds = projects.map((project) => project._id);
  const [plans, payments, quotations, total] = await Promise.all([
    PaymentPlan.find({ project: { $in: projectIds }, isActive: true }).lean(),
    populatePayment(Payment.find({ project: { $in: projectIds } }).sort({ paymentDate: 1 })).lean(),
    Quotation.find({ project: { $in: projectIds }, status: "Accepted", isActive: { $ne: false } }).select("project customer grandTotal").sort({ acceptedAt: -1 }).lean(),
    SolarProject.countDocuments({ isActive: true }),
  ]);
  const planByProject = new Map(plans.map((plan) => [String(plan.project), plan]));
  const quoteByProject = new Map();
  for (const quote of quotations) if (!quoteByProject.has(String(quote.project))) quoteByProject.set(String(quote.project), quote);
  const paymentsByProject = new Map();
  for (const payment of payments) {
    const key = String(payment.project?._id ?? payment.project);
    if (!paymentsByProject.has(key)) paymentsByProject.set(key, []);
    paymentsByProject.get(key).push(payment);
  }
  const items = projects.map((project) => {
    const plan = planByProject.get(String(project._id)) ?? null;
    const quote = quoteByProject.get(String(project._id));
    const projectPayments = paymentsByProject.get(String(project._id)) ?? [];
    return {
      project, plan, payments: projectPayments,
      totalAmount: plan?.totalAmount ?? quote?.grandTotal ?? 0,
    };
  });
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const savePaymentPlan = asyncHandler(async (req, res) => {
  if (!validId(req.params.projectId)) throw new AppError("Invalid project ID", 400, "INVALID_ID");
  const project = await SolarProject.findOne({ _id: req.params.projectId, isActive: true });
  if (!project) throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  const body = req.body;
  if (!body || !planTypes.includes(body.planType)) throw new AppError("Choose a valid payment plan", 400, "INVALID_PLAN");
  const totalAmount = Number(body.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new AppError("Project amount must be greater than zero", 400, "INVALID_AMOUNT");
  if (!Array.isArray(body.installments) || body.installments.length === 0) throw new AppError("Add at least one installment", 400, "INSTALLMENTS_REQUIRED");
  const installments = body.installments.map((entry) => {
    const amount = Number(entry.amount);
    const dueDate = typeof entry.dueDate === "string" ? new Date(entry.dueDate) : new Date(Number.NaN);
    if (!entry || typeof entry.label !== "string" || !entry.label.trim() || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueDate.getTime()) || !["Customer", "Loan"].includes(entry.source)) {
      throw new AppError("Every installment needs a name, positive amount, due date, and valid source", 400, "INVALID_INSTALLMENT");
    }
    return { label: entry.label.trim(), amount, dueDate, source: entry.source };
  });
  const installmentTotal = installments.reduce((sum, entry) => sum + entry.amount, 0);
  if (Math.abs(installmentTotal - totalAmount) > 0.01) throw new AppError("Installment amounts must add up to the project amount", 400, "PLAN_TOTAL_MISMATCH");
  const loanAmount = installments.filter((entry) => entry.source === "Loan").reduce((sum, entry) => sum + entry.amount, 0);
  const loanProvider = typeof body.loanProvider === "string" ? body.loanProvider.trim() : "";
  if (loanAmount > 0 && !loanProvider) throw new AppError("Enter the bank or finance provider", 400, "LOAN_PROVIDER_REQUIRED");
  const existing = await PaymentPlan.findOne({ project: project._id, isActive: true });
  const previousPayments = await Payment.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: "$source", amount: { $sum: "$amount" } } },
  ]);
  const paidBySource = new Map(previousPayments.map((entry) => [entry._id, entry.amount]));
  if ((paidBySource.get("Customer") ?? 0) > totalAmount - loanAmount || (paidBySource.get("Loan") ?? 0) > loanAmount) {
    throw new AppError("The new plan cannot be smaller than amounts already received", 409, "PLAN_BELOW_RECEIVED");
  }
  const loanStatus = body.loanStatus ?? existing?.loanStatus ?? "Applied";
  if (!["Applied", "Approved", "Rejected", "Disbursed"].includes(loanStatus)) throw new AppError("Choose a valid loan status", 400, "INVALID_LOAN_STATUS");
  if (loanAmount === 0 && paidBySource.get("Loan")) throw new AppError("Loan receipts already exist for this project", 409, "LOAN_RECEIPTS_EXIST");
  const update = {
    project: project._id, customer: project.customer, planType: body.planType, totalAmount, installments,
    loanProvider, loanApplicationNumber: typeof body.loanApplicationNumber === "string" ? body.loanApplicationNumber.trim() : "",
    loanStatus, updatedBy: req.auth.userId,
  };
  const plan = existing
    ? await PaymentPlan.findOneAndUpdate({ _id: existing._id }, { $set: update }, { new: true, runValidators: true })
    : await PaymentPlan.create({ ...update, createdBy: req.auth.userId });
  res.json({ success: true, data: { item: plan } });
});

export const createPayment = asyncHandler(async (req, res) => {
  const { projectId, invoiceId, amount: rawAmount, mode, paymentDate, reference = "", source: requestedSource } = req.body ?? {};
  if (!modes.includes(mode)) throw new AppError("Choose a valid payment mode", 400, "INVALID_MODE");
  const source = mode === "Loan disbursement" ? "Loan" : requestedSource === "Loan" ? "Loan" : "Customer";
  if ((source === "Loan") !== (mode === "Loan disbursement")) throw new AppError("Use Loan disbursement mode only for loan receipts", 400, "INVALID_SOURCE");
  const amount = Number(rawAmount);
  const receivedAt = typeof paymentDate === "string" ? new Date(paymentDate) : new Date(Number.NaN);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("Payment amount must be greater than zero", 400, "INVALID_AMOUNT");
  if (Number.isNaN(receivedAt.getTime())) throw new AppError("Enter a valid payment date", 400, "INVALID_DATE");
  if (mode !== "Cash" && !String(reference).trim()) throw new AppError("Add the payment reference number", 400, "REFERENCE_REQUIRED");
  let invoice = null;
  if (invoiceId) {
    if (!validId(invoiceId)) throw new AppError("Invalid invoice ID", 400, "INVALID_INVOICE");
    invoice = await Invoice.findOne({ _id: invoiceId, isActive: true, status: "Sent" });
    if (!invoice) throw new AppError("Select a sent invoice belonging to this project", 400, "INVALID_INVOICE");
    if (projectId && String(invoice.project ?? "") !== String(projectId)) throw new AppError("Invoice and project do not match", 400, "INVALID_INVOICE");
    const paid = await Payment.aggregate([{ $match: { invoice: invoice._id } }, { $group: { _id: null, amount: { $sum: "$amount" } } }]);
    if (amount > invoice.totalAmount - (paid[0]?.amount ?? 0)) throw new AppError("Payment exceeds this invoice's outstanding balance", 409, "OVERPAYMENT");
  }
  const resolvedProjectId = projectId || null;
  const project = resolvedProjectId ? await SolarProject.findOne({ _id: resolvedProjectId, isActive: true }) : null;
  if (resolvedProjectId && !project) throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
  if (!project && !invoice) throw new AppError("Select a project or invoice", 400, "PAYMENT_TARGET_REQUIRED");
  if (project && invoice && String(invoice.customer) !== String(project.customer)) throw new AppError("Invoice and project customer do not match", 400, "INVALID_INVOICE");
  const plan = project && !invoice ? await PaymentPlan.findOne({ project: project._id, isActive: true }) : null;
  if (project && !invoice && !plan) throw new AppError("Set a payment plan before recording project receipts", 409, "PLAN_REQUIRED");
  let received = { amount: 0 };
  let allowed = Infinity;
  if (plan) {
    const [alreadyReceived] = await Payment.aggregate([
      { $match: { project: project._id, source } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    received = alreadyReceived ?? received;
    allowed = plan.installments.filter((entry) => entry.source === source).reduce((sum, entry) => sum + entry.amount, 0);
    if (amount > allowed - received.amount) throw new AppError("Payment exceeds the remaining amount for this payment source", 409, "OVERPAYMENT");
    if (source === "Loan" && !["Approved", "Disbursed"].includes(plan.loanStatus)) throw new AppError("Loan must be approved before recording disbursement", 409, "LOAN_NOT_APPROVED");
  } else if (source === "Loan") {
    throw new AppError("Loan disbursements must be linked to a project payment plan", 409, "PLAN_REQUIRED");
  }
  const item = await Payment.create({
    paymentNumber: await nextSequence("PAY"), customer: project?.customer ?? invoice.customer, project: invoice ? null : project?._id ?? null,
    invoice: invoice?._id ?? null, amount, mode, source, paymentDate: receivedAt,
    reference: String(reference).trim(), createdBy: req.auth.userId,
  });
  if (source === "Loan" && plan) {
    const outstanding = allowed - received.amount - amount;
    if (outstanding <= 0) await PaymentPlan.updateOne({ _id: plan._id }, { $set: { loanStatus: "Disbursed", updatedBy: req.auth.userId } });
  }
  const populated = await populatePayment(Payment.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const paymentOptions = asyncHandler(async (_req, res) => {
  const projects = await SolarProject.find({ isActive: true }).populate("customer", "customerName phone").select("_id projectCode customer systemSizeKw").sort({ createdAt: -1 }).lean();
  const invoices = await Invoice.find({ isActive: true, status: "Sent" }).select("_id invoiceNumber project totalAmount").sort({ issueDate: -1 }).lean();
  res.json({ success: true, data: { projects, invoices } });
});
