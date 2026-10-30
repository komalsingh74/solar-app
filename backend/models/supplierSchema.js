
import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    // Supplier tab
    supplierName: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    // Supplies entered as comma-separated values in the UI
    supplies: {
      type: [String],
      default: [],
    },

    // Address & terms tab
    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    paymentTerms: {
      type: String,
      enum: [
        "Advance",
        "Immediate",
        "7 Days",
        "15 Days",
        "30 Days",
        "45 Days",
        "60 Days",
        "Net 15",
        "Net 30",
        "Net 45",
      ],
      default: "Advance",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
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

// Supplier names are unique across this single-tenant application.
supplierSchema.index({ supplierName: 1 }, { unique: true });

// Common queries
supplierSchema.index({ status: 1 });
supplierSchema.index({ phone: 1 });

const Supplier =
  mongoose.models.Supplier ||
  mongoose.model("Supplier", supplierSchema);

export default Supplier;
