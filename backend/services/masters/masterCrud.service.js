import mongoose from "mongoose";
import AppError from "../../utils/AppError.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (query) => {
  const page = Number.parseInt(query.page, 10) || 1;
  const requestedLimit = Number.parseInt(query.limit, 10) || 20;
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, requestedLimit)),
  };
};

const pickFields = (body, fields) =>
  Object.fromEntries(
    fields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]])
  );

const assertBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  }
};

export default function createMasterCrudHandlers(config) {
  const list = async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const filter = config.buildFilter
      ? await config.buildFilter(req)
      : {};
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (q) {
      const expression = new RegExp(escapeRegex(q), "i");
      const searchFilters = config.searchFields.map((field) => ({ [field]: expression }));
      if (config.buildSearchFilter) {
        searchFilters.push(await config.buildSearchFilter(expression));
      }
      filter.$and = [
        ...(filter.$and || []),
        { $or: searchFilters.filter(Boolean) },
      ];
    }

    if (
      typeof req.query.status === "string" &&
      ["Active", "Inactive"].includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    const [total, records] = await Promise.all([
      config.Model.countDocuments(filter),
      config.Model.find(filter)
        .sort(config.sort || { updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(config.populate || []),
    ]);
    const items = config.mapList
      ? await config.mapList(records)
      : records;

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  };

  const create = async (req, res) => {
    assertBody(req.body);
    const userId = req.auth.userId;
    const fields = config.prepare
      ? await config.prepare(req.body, userId, null)
      : pickFields(req.body, config.fields);
    const item = await config.Model.create({
      ...fields,
      createdBy: userId,
      updatedBy: userId,
    });
    if (config.populate) await item.populate(config.populate);
    res.status(201).json({
      success: true,
      message: "Master record created",
      data: { item },
    });
  };

  const update = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Invalid resource ID", 400, "INVALID_ID");
    }
    assertBody(req.body);
    const item = await config.Model.findById(req.params.id);
    if (!item) {
      throw new AppError("Master record not found", 404, "RESOURCE_NOT_FOUND");
    }
    const fields = config.prepare
      ? await config.prepare(req.body, req.auth.userId, item)
      : pickFields(req.body, config.fields);
    Object.assign(item, fields, { updatedBy: req.auth.userId });
    await item.save();
    if (config.populate) await item.populate(config.populate);
    res.status(200).json({
      success: true,
      message: "Master record updated",
      data: { item },
    });
  };

  const remove = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Invalid resource ID", 400, "INVALID_ID");
    }
    const item = await config.Model.findById(req.params.id);
    if (!item) {
      throw new AppError("Master record not found", 404, "RESOURCE_NOT_FOUND");
    }
    if (config.beforeDelete) await config.beforeDelete(item._id);
    await item.deleteOne();
    res.status(200).json({
      success: true,
      message: "Master record deleted",
      data: { id: item._id },
    });
  };

  return {
    list,
    create,
    update,
    remove,
  };
}
