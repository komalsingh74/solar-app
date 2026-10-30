import Category from "../../models/categorySchema.js";
import Lead from "../../models/lead.js";
import LeadSource from "../../models/leadSource.js";
import Supplier from "../../models/supplierSchema.js";
import Warehouse from "../../models/warehouseSchema.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import createMasterCrudHandlers from "../../services/masters/masterCrud.service.js";

const leadSources = createMasterCrudHandlers({
  Model: LeadSource,
  searchFields: ["sourceName", "channel", "description"],
  fields: ["sourceName", "channel", "status", "description"],
  beforeDelete: async (id) => {
    if (await Lead.exists({ source: id })) {
      throw new AppError("Lead source is used by CRM leads and cannot be deleted", 409, "RESOURCE_IN_USE");
    }
  },
  mapList: async (records) => {
    const ids = records.map((item) => item._id);
    const counts = await Lead.aggregate([
      { $match: { source: { $in: ids }, isActive: { $ne: false } } },
      {
        $group: {
          _id: "$source",
          leads: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$stage", "Won"] }, 1, 0] } },
        },
      },
    ]);
    const bySource = new Map(counts.map((entry) => [String(entry._id), entry]));
    return records.map((item) => ({
      ...item.toObject(),
      leadCount: bySource.get(String(item._id))?.leads ?? 0,
      convertedCount: bySource.get(String(item._id))?.converted ?? 0,
    }));
  },
});

export const masterHandlers = {
  "lead-sources": leadSources,
  suppliers: createMasterCrudHandlers({
    Model: Supplier,
    searchFields: ["supplierName", "contactPerson", "phone", "city", "supplies"],
    fields: [
      "supplierName", "contactPerson", "phone", "email", "gstin", "supplies",
      "address", "city", "paymentTerms", "status",
    ],
  }),
  warehouses: createMasterCrudHandlers({
    Model: Warehouse,
    searchFields: ["locationName", "city", "inCharge", "address"],
    fields: ["locationName", "type", "rackZone", "inCharge", "address", "city", "status"],
  }),
  "expense-categories": createMasterCrudHandlers({
    Model: Category,
    searchFields: ["categoryName", "group", "description"],
    fields: ["categoryName", "group", "monthlyBudget", "receiptRequired", "status", "description"],
  }),
};

export const listMasterRecords = (resource) => {
  const handlers = masterHandlers[resource];
  if (!handlers) {
    return (req, res, next) => next(new AppError("Unknown master resource", 404, "RESOURCE_NOT_FOUND"));
  }
  return asyncHandler(handlers.list);
};

export const createMasterRecord = (resource) => {
  const handlers = masterHandlers[resource];
  if (!handlers) {
    return (req, res, next) => next(new AppError("Unknown master resource", 404, "RESOURCE_NOT_FOUND"));
  }
  return asyncHandler(handlers.create);
};

export const updateMasterRecord = (resource) => {
  const handlers = masterHandlers[resource];
  if (!handlers) {
    return (req, res, next) => next(new AppError("Unknown master resource", 404, "RESOURCE_NOT_FOUND"));
  }
  return asyncHandler(handlers.update);
};

export const deleteMasterRecord = (resource) => {
  const handlers = masterHandlers[resource];
  if (!handlers) {
    return (req, res, next) => next(new AppError("Unknown master resource", 404, "RESOURCE_NOT_FOUND"));
  }
  return asyncHandler(handlers.remove);
};
