import mongoose from "mongoose";
import InventoryMovement from "../models/InventoryMovement.js";
import Item from "../models/itemSchema.js";
import ProductCategory from "../models/ProductCategory.js";
import SolarProject from "../models/SolarProject.js";
import StockBalance from "../models/StockBalance.js";
import Warehouse from "../models/warehouseSchema.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { recordInventoryMovement } from "../services/inventoryMovement.service.js";

const validId = mongoose.isValidObjectId;
const paging = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50)) });
const populateMovement = (query) => query
  .populate({ path: "item", select: "itemName sku unit categoryId", populate: { path: "categoryId", select: "categoryName" } })
  .populate("fromWarehouse", "locationName")
  .populate("toWarehouse", "locationName")
  .populate("project", "projectCode")
  .populate("purchaseOrder", "orderNumber")
  .populate("createdBy", "name");

export const inventoryOptions = asyncHandler(async (_req, res) => {
  const [items, warehouses, employees, projects] = await Promise.all([
    Item.find({ status: "Active" }).populate("categoryId", "categoryName").select("_id itemName sku unit unitPrice minimumStock categoryId").sort({ itemName: 1 }).lean(),
    Warehouse.find({ status: "Active" }).select("_id locationName type").sort({ locationName: 1 }).lean(),
    User.find({ status: "Active" }).select("_id name").sort({ name: 1 }).lean(),
    SolarProject.find({ isActive: true }).select("_id projectCode").sort({ projectCode: 1 }).lean(),
  ]);
  res.json({ success: true, data: { items, warehouses, employees, projects } });
});

export const listStock = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { status: "Active" };
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const categories = await ProductCategory.find({ categoryName: expression }).distinct("_id");
    filter.$or = [{ itemName: expression }, { sku: expression }, ...(categories.length ? [{ categoryId: { $in: categories } }] : [])];
  }
  const [items, total] = await Promise.all([
    Item.find(filter).populate("categoryId", "categoryName").sort({ itemName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Item.countDocuments(filter),
  ]);
  const itemIds = items.map((item) => item._id);
  const balances = await StockBalance.find({ item: { $in: itemIds } }).populate("warehouse", "locationName type").lean();
  const balanceMap = new Map();
  for (const balance of balances) {
    const itemKey = String(balance.item);
    if (!balanceMap.has(itemKey)) balanceMap.set(itemKey, []);
    balanceMap.get(itemKey).push(balance);
  }
  const result = items.map((item) => ({ ...item, stock: balanceMap.get(String(item._id)) ?? [] }));
  res.json({ success: true, data: { items: result, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const listInventoryMovements = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = {};
  if (["Received", "Issued", "Transfer", "Returned"].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.item && validId(req.query.item)) filter.item = req.query.item;
  if (req.query.fromWarehouse && validId(req.query.fromWarehouse)) filter.$or = [{ fromWarehouse: req.query.fromWarehouse }, { toWarehouse: req.query.fromWarehouse }];
  const [items, total] = await Promise.all([
    populateMovement(InventoryMovement.find(filter).sort({ movementDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
    InventoryMovement.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createInventoryMovement = asyncHandler(async (req, res) => {
  const { itemId, type, quantity, fromWarehouseId, toWarehouseId, reference, projectId, movementDate } = req.body ?? {};
  if (!validId(itemId) || !await Item.exists({ _id: itemId, status: "Active" })) throw new AppError("Select an active product item", 400, "INVALID_ITEM");
  if (!validId(toWarehouseId) || !await Warehouse.exists({ _id: toWarehouseId, status: "Active" })) throw new AppError("Select an active destination warehouse", 400, "INVALID_WAREHOUSE");
  if (type !== "Received" && (!validId(fromWarehouseId) || !await Warehouse.exists({ _id: fromWarehouseId, status: "Active" }))) throw new AppError("Select an active source warehouse", 400, "INVALID_WAREHOUSE");
  if (["Issued", "Returned"].includes(type) && !projectId) throw new AppError("Select the related solar project", 400, "PROJECT_REQUIRED");
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, isActive: true }))) throw new AppError("Select an active solar project", 400, "INVALID_PROJECT");
  const parsedDate = movementDate ? new Date(movementDate) : new Date();
  if (Number.isNaN(parsedDate.getTime())) throw new AppError("Enter a valid movement date", 400, "INVALID_DATE");
  const item = await recordInventoryMovement({
    item: itemId, type, quantity, fromWarehouse: fromWarehouseId || null, toWarehouse: toWarehouseId,
    reference, project: projectId || null, movementDate: parsedDate,
  }, req.auth.userId);
  const populated = await populateMovement(InventoryMovement.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});
