import Item from "../../models/itemSchema.js";
import Lead from "../../models/lead.js";
import ProductCategory from "../../models/ProductCategory.js";
import Quotation from "../../models/quotation.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import createMasterCrudHandlers from "../../services/masters/masterCrud.service.js";

const itemFields = [
  "itemName", "sku", "hsnCode", "unit", "status", "unitPrice", "gstRate", "minimumStock",
];

const itemHandlers = createMasterCrudHandlers({
  Model: Item,
  searchFields: ["itemName", "sku", "hsnCode"],
  fields: itemFields,
  populate: { path: "categoryId", select: "categoryName" },
  buildFilter: async (req) => {
    if (typeof req.query.category !== "string" || !req.query.category.trim()) return {};
    const category = await ProductCategory.findOne({
      categoryName: req.query.category.trim(),
    }).select("_id");
    return { categoryId: category?._id ?? null };
  },
  buildSearchFilter: async (expression) => {
    const categoryIds = await ProductCategory.find({ categoryName: expression }).distinct("_id");
    return categoryIds.length ? { categoryId: { $in: categoryIds } } : null;
  },
  prepare: async (body, userId, existing) => {
    const fields = Object.fromEntries(
      itemFields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]])
    );
    if (Object.hasOwn(body, "categoryName")) {
      if (typeof body.categoryName !== "string" || !body.categoryName.trim()) {
        throw new AppError("Category is required", 400, "INVALID_CATEGORY");
      }
      const categoryName = body.categoryName.trim();
      const category = await ProductCategory.findOneAndUpdate(
        { categoryName },
        {
          $setOnInsert: { categoryName, createdBy: userId },
          $set: { updatedBy: userId },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      fields.categoryId = category._id;
    } else if (!existing) {
      throw new AppError("Category is required", 400, "INVALID_CATEGORY");
    }
    return fields;
  },
  beforeDelete: async (id) => {
    const [quotation, lead] = await Promise.all([
      Quotation.exists({ "items.item": id }),
      Lead.exists({ "items.item": id }),
    ]);
    if (quotation || lead) {
      throw new AppError("Item is linked to quotation or CRM records and cannot be deleted", 409, "RESOURCE_IN_USE");
    }
  },
});

export const listItems = asyncHandler(itemHandlers.list);
export const createItem = asyncHandler(itemHandlers.create);
export const updateItem = asyncHandler(itemHandlers.update);
export const deleteItem = asyncHandler(itemHandlers.remove);

export const listProductCategories = asyncHandler(async (req, res) => {
  const items = await ProductCategory.find({ status: "Active" }).sort({ categoryName: 1 });
  res.status(200).json({ success: true, data: { items } });
});
