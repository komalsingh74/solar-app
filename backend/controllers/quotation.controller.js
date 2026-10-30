import mongoose from "mongoose";
import Customer from "../models/customerSchema.js";
import Item from "../models/itemSchema.js";
import Lead from "../models/lead.js";
import Quotation from "../models/quotation.js";
import Sequence from "../models/Sequence.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const statuses = ["Draft", "Sent", "Accepted", "Rejected", "Expired", "Cancelled"];
const validId = (value) => mongoose.isValidObjectId(value);
const pageParams = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)),
});

const nextNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await Sequence.findOneAndUpdate(
    { _id: `quotation-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `Q-${year}-${String(sequence.value).padStart(5, "0")}`;
};

const prepareQuotation = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");

  const customerId = body.customerId ?? (existing ? String(existing.customer) : "");
  if (!validId(customerId)) throw new AppError("Select a valid customer", 400, "INVALID_CUSTOMER");
  if (!await Customer.exists({ _id: customerId })) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

  const leadId = body.leadId ?? (existing?.lead ? String(existing.lead) : "");
  if (leadId && (!validId(leadId) || !await Lead.exists({ _id: leadId, isActive: { $ne: false } }))) {
    throw new AppError("Select a valid lead", 400, "INVALID_LEAD");
  }
  const capacity = Number(body.solarCapacityKw ?? existing?.solarCapacityKw);
  if (!Number.isFinite(capacity) || capacity < 0.1) throw new AppError("Solar capacity must be at least 0.1 kW", 400, "INVALID_CAPACITY");
  const phase = body.phase ?? existing?.phase ?? "Single";
  if (!["Single", "Three"].includes(phase)) throw new AppError("Choose a valid phase", 400, "INVALID_PHASE");
  const validForDays = Number(body.validForDays ?? existing?.validForDays ?? 15);
  if (!Number.isInteger(validForDays) || validForDays < 1) throw new AppError("Validity must be at least one day", 400, "INVALID_VALIDITY");

  const incomingItems = Array.isArray(body.items)
    ? body.items
    : existing?.items?.map((item) => item.toObject?.() ?? item);
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) throw new AppError("Add at least one quotation item", 400, "ITEMS_REQUIRED");
  const itemIds = incomingItems.map((line) => line.itemId ?? line.item);
  if (itemIds.some((id) => !validId(id))) throw new AppError("Choose a valid item for every quotation line", 400, "INVALID_ITEM");
  const products = await Item.find({ _id: { $in: itemIds }, status: "Active" }).select("itemName unit unitPrice gstRate").lean();
  const productById = new Map(products.map((product) => [String(product._id), product]));
  if (productById.size !== new Set(itemIds.map(String)).size) throw new AppError("One or more selected items are unavailable", 400, "ITEM_UNAVAILABLE");

  const subtotal = incomingItems.reduce((total, line) => {
    const quantity = Number(line.quantity ?? line.qty);
    const rate = Number(line.rate ?? productById.get(String(line.itemId ?? line.item))?.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) {
      throw new AppError("Each item requires a positive quantity and a non-negative rate", 400, "INVALID_LINE_ITEM");
    }
    return total + quantity * rate;
  }, 0);
  const discountType = body.discountType ?? "Percentage";
  if (!["Percentage", "Fixed"].includes(discountType)) throw new AppError("Choose a valid discount type", 400, "INVALID_DISCOUNT");
  const discountValue = Number(body.discountValue ?? body.discount ?? 0);
  if (!Number.isFinite(discountValue) || discountValue < 0 || (discountType === "Percentage" && discountValue > 100)) {
    throw new AppError("Enter a valid discount", 400, "INVALID_DISCOUNT");
  }
  const discountAmount = discountType === "Percentage" ? subtotal * discountValue / 100 : Math.min(subtotal, discountValue);
  const taxableAmount = subtotal - discountAmount;
  const gstPercent = Number(body.gstPercent ?? body.gst ?? 0);
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) throw new AppError("Enter a valid GST percentage", 400, "INVALID_GST");
  let gstAmount = 0;
  const items = incomingItems.map((line) => {
    const id = String(line.itemId ?? line.item);
    const product = productById.get(id);
    const quantity = Number(line.quantity ?? line.qty);
    const rate = Number(line.rate ?? product.unitPrice);
    const lineSubtotal = quantity * rate;
    const lineDiscount = discountAmount * lineSubtotal / (subtotal || 1);
    const lineTaxable = lineSubtotal - lineDiscount;
    const lineGst = lineTaxable * gstPercent / 100;
    gstAmount += lineGst;
    return {
      item: product._id,
      itemName: product.itemName,
      description: typeof line.description === "string" ? line.description : "",
      quantity,
      unit: product.unit,
      rate,
      discountPercent: subtotal ? discountAmount / subtotal * 100 : 0,
      gstPercent,
      taxableAmount: lineTaxable,
      gstAmount: lineGst,
      totalAmount: lineTaxable + lineGst,
    };
  });

  const issueDate = body.issueDate ? new Date(body.issueDate) : existing?.issueDate ?? new Date();
  if (Number.isNaN(issueDate.getTime())) throw new AppError("Enter a valid issue date", 400, "INVALID_ISSUE_DATE");
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + validForDays);
  const values = {
    customer: customerId,
    lead: leadId || null,
    solarCapacityKw: capacity,
    phase,
    validForDays,
    issueDate,
    validUntil,
    items,
    subTotal: subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxableAmount,
    grandTotal: taxableAmount + gstAmount,
    gstPercent,
    gstAmount,
    cgstAmount: gstAmount / 2,
    sgstAmount: gstAmount / 2,
    igstAmount: 0,
    termsAndConditions: body.termsAndConditions ?? body.notes ?? existing?.termsAndConditions ?? "",
    notes: body.notes ?? existing?.notes ?? "",
    status: body.status ?? existing?.status ?? "Draft",
    updatedBy: userId,
  };
  if (!statuses.includes(values.status)) throw new AppError("Choose a valid quotation status", 400, "INVALID_STATUS");
  if (values.status === "Sent" && !existing?.sentAt) values.sentAt = new Date();
  if (values.status === "Accepted" && !existing?.acceptedAt) values.acceptedAt = new Date();
  if (!existing) {
    values.quotationNumber = await nextNumber();
    values.createdBy = userId;
  }
  return values;
};

const populateQuotation = (query) => query
  .populate("customer", "customerId customerName phone email")
  .populate("lead", "name phone stage")
  .populate("items.item", "itemName sku unit");

export const listQuotations = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = { isActive: { $ne: false } };
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const customers = await Customer.find({ customerName: { $regex: escaped, $options: "i" } }).distinct("_id");
    filter.$or = [
      { quotationNumber: { $regex: escaped, $options: "i" } },
      ...(customers.length ? [{ customer: { $in: customers } }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    populateQuotation(Quotation.find(filter).sort({ issueDate: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    Quotation.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createQuotation = asyncHandler(async (req, res) => {
  const item = await Quotation.create(await prepareQuotation(req.body, req.auth.userId, null));
  if (item.lead) await Lead.updateOne({ _id: item.lead }, { $addToSet: { quotations: item._id }, $set: { quotationAmount: item.grandTotal } });
  const populated = await populateQuotation(Quotation.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateQuotation = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid quotation ID", 400, "INVALID_ID");
  const item = await Quotation.findOne({ _id: req.params.id, isActive: { $ne: false } });
  if (!item) throw new AppError("Quotation not found", 404, "QUOTATION_NOT_FOUND");
  const previousLead = item.lead ? String(item.lead) : null;
  Object.assign(item, await prepareQuotation(req.body, req.auth.userId, item));
  await item.save();
  if (previousLead && previousLead !== String(item.lead || "")) {
    await Lead.updateOne({ _id: previousLead }, { $pull: { quotations: item._id } });
  }
  if (item.lead) await Lead.updateOne({ _id: item.lead }, { $addToSet: { quotations: item._id }, $set: { quotationAmount: item.grandTotal } });
  const populated = await populateQuotation(Quotation.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteQuotation = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid quotation ID", 400, "INVALID_ID");
  const item = await Quotation.findOneAndUpdate(
    { _id: req.params.id, isActive: { $ne: false } },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!item) throw new AppError("Quotation not found", 404, "QUOTATION_NOT_FOUND");
  if (item.lead) await Lead.updateOne({ _id: item.lead }, { $pull: { quotations: item._id } });
  res.json({ success: true, data: { id: item._id } });
});
