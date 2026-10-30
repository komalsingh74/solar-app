import mongoose from "mongoose";
import Item from "../models/itemSchema.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/supplierSchema.js";
import Warehouse from "../models/warehouseSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import nextSequence from "../services/nextSequence.js";
import { recordInventoryMovement, undoInventoryMovement } from "../services/inventoryMovement.service.js";

const stages = ["Draft", "Ordered", "Received", "Billed", "Paid"];
const validId = mongoose.isValidObjectId;
const paging = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) });
const populateOrder = (query) => query
  .populate("supplier", "supplierName phone")
  .populate("warehouse", "locationName")
  .populate("items.item", "itemName sku unit");

const prepareOrder = async (body, userId) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  if (!validId(body.supplierId) || !await Supplier.exists({ _id: body.supplierId, status: "Active" })) throw new AppError("Select an active supplier", 400, "INVALID_SUPPLIER");
  if (!validId(body.warehouseId) || !await Warehouse.exists({ _id: body.warehouseId, status: "Active" })) throw new AppError("Select an active receiving warehouse", 400, "INVALID_WAREHOUSE");
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) throw new AppError("Add between 1 and 100 purchase order items", 400, "ITEMS_REQUIRED");
  const expectedAt = typeof body.expectedAt === "string" ? new Date(body.expectedAt) : new Date(Number.NaN);
  if (!body.expectedAt || Number.isNaN(expectedAt.getTime())) throw new AppError("Enter a valid expected delivery date", 400, "INVALID_DATE");
  if (body.items.some((line) => !line || typeof line !== "object" || Array.isArray(line))) {
    throw new AppError("Every purchase order line must be an object", 400, "INVALID_LINE_ITEM");
  }
  const ids = body.items.map((line) => line.itemId);
  if (ids.some((id) => !validId(id))) throw new AppError("Select a valid product on every line", 400, "INVALID_ITEM");
  const products = await Item.find({ _id: { $in: ids }, status: "Active" }).select("_id itemName unitPrice").lean();
  const byId = new Map(products.map((item) => [String(item._id), item]));
  if (byId.size !== new Set(ids.map(String)).size) throw new AppError("One or more selected items are unavailable", 400, "ITEM_UNAVAILABLE");
  const items = body.items.map((line) => {
    const product = byId.get(String(line.itemId));
    const quantity = Number(line.quantity);
    const rate = Number(line.rate ?? product.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw new AppError("Enter a positive quantity and non-negative item rate", 400, "INVALID_LINE_ITEM");
    return { item: product._id, itemName: product.itemName, quantity, receivedQuantity: 0, rate, lineTotal: quantity * rate };
  });
  return {
    supplier: body.supplierId,
    warehouse: body.warehouseId,
    items,
    expectedAt,
    amount: items.reduce((total, line) => total + line.lineTotal, 0),
    notes: typeof body.notes === "string" ? body.notes : "",
    updatedBy: userId,
  };
};

export const purchaseOrderOptions = asyncHandler(async (_req, res) => {
  const [suppliers, warehouses, items] = await Promise.all([
    Supplier.find({ status: "Active" }).select("_id supplierName").sort({ supplierName: 1 }).lean(),
    Warehouse.find({ status: "Active" }).select("_id locationName").sort({ locationName: 1 }).lean(),
    Item.find({ status: "Active" }).select("_id itemName sku unit unitPrice").sort({ itemName: 1 }).lean(),
  ]);
  res.json({ success: true, data: { suppliers, warehouses, items } });
});

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { isActive: true };
  if (stages.includes(req.query.stage)) filter.stage = req.query.stage;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const suppliers = await Supplier.find({ supplierName: expression }).distinct("_id");
    filter.$or = [
      { orderNumber: expression },
      { "items.itemName": expression },
      ...(suppliers.length ? [{ supplier: { $in: suppliers } }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    populateOrder(PurchaseOrder.find(filter).sort({ orderedAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    PurchaseOrder.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const values = await prepareOrder(req.body, req.auth.userId);
  values.orderNumber = await nextSequence("PO");
  values.createdBy = req.auth.userId;
  const item = await PurchaseOrder.create(values);
  const populated = await populateOrder(PurchaseOrder.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid purchase order ID", 400, "INVALID_ID");
  const item = await PurchaseOrder.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (item.stage !== "Draft") throw new AppError("Only draft purchase orders can be edited", 409, "ORDER_NOT_EDITABLE");
  Object.assign(item, await prepareOrder(req.body, req.auth.userId));
  await item.save();
  const populated = await populateOrder(PurchaseOrder.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const advancePurchaseOrder = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid purchase order ID", 400, "INVALID_ID");
  const item = await PurchaseOrder.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  const nextStage = stages[stages.indexOf(item.stage) + 1];
  if (!nextStage) throw new AppError("Purchase order is already paid", 409, "ORDER_COMPLETE");
  if (req.body?.stage !== nextStage) throw new AppError(`The next valid order stage is ${nextStage}`, 409, "INVALID_TRANSITION");

  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: item._id, stage: item.stage, isActive: true },
    { $set: { stage: nextStage, updatedBy: req.auth.userId, ...(nextStage === "Paid" ? { paidAt: new Date() } : {}) } },
    { new: true },
  );
  if (!updated) throw new AppError("Purchase order changed; reload and try again", 409, "ORDER_CONFLICT");

  if (nextStage === "Received") {
    const applied = [];
    try {
      for (const line of item.items) {
        const movement = await recordInventoryMovement({
          item: line.item, type: "Received", quantity: line.quantity, toWarehouse: item.warehouse,
          reference: item.orderNumber, purchaseOrder: item._id, movementDate: new Date(),
        }, req.auth.userId);
        applied.push(movement);
      }
      await Promise.all(item.items.map((line) => PurchaseOrder.updateOne(
        { _id: item._id, "items._id": line._id },
        { $set: { "items.$.receivedQuantity": line.quantity } },
      )));
    } catch (error) {
      for (const movement of applied.reverse()) await undoInventoryMovement(movement, req.auth.userId);
      await PurchaseOrder.updateOne({ _id: item._id, stage: "Received" }, { $set: { stage: "Ordered", updatedBy: req.auth.userId } });
      throw error;
    }
  }
  const populated = await populateOrder(PurchaseOrder.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid purchase order ID", 400, "INVALID_ID");
  const item = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, isActive: true, stage: "Draft" },
    { $set: { isActive: false, updatedBy: req.auth.userId } },
    { new: true },
  );
  if (!item) throw new AppError("Only draft purchase orders can be deleted", 409, "ORDER_NOT_DELETABLE");
  res.json({ success: true, data: { id: item._id } });
});
