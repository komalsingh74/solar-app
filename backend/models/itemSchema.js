
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    // Basic tab
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },

    sku: {
      type: String,
      required: [true, "SKU / code is required"],
      trim: true,
      uppercase: true,
    },

    hsnCode: {
      type: String,
      trim: true,
      default: "",
    },

    // Store category as a reference to Product Category Master
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },

    // Unit, e.g. Nos, Kg, Meter
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      default: "Nos",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // Pricing & Stock tab
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 5,
    },

    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// SKUs are unique across this single-tenant application.
itemSchema.index({ sku: 1 }, { unique: true });

// Common filters
itemSchema.index({ categoryId: 1 });
itemSchema.index({ status: 1 });

const Item =
  mongoose.models.Item ||
  mongoose.model("Item", itemSchema);

export default Item;
