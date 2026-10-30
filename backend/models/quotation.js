
import mongoose from "mongoose";

const { Schema } = mongoose;

// Quotation line items
const quotationItemSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unit: {
      type: String,
      trim: true,
      default: "Nos",
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    gstPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const quotationSchema = new Schema(
  {
    // Unique quotation number across this single-tenant application
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer reference
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // Optional CRM lead reference
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    // Optional project reference
    project: {
      type: Schema.Types.ObjectId,
      ref: "SolarProject",
      default: null,
    },

    // Solar configuration
    solarCapacityKw: {
      type: Number,
      required: true,
      min: 0.1,
    },

    phase: {
      type: String,
      enum: ["Single", "Three"],
      default: "Single",
    },

    // Validity
    validForDays: {
      type: Number,
      required: true,
      min: 1,
      default: 15,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      required: true,
    },

    // Quotation items
    items: {
      type: [quotationItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one quotation item is required",
      },
    },

    // Pricing summary
    subTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Percentage",
    },

    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    gstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    igstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Commercial terms
    termsAndConditions: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Workflow status
    status: {
      type: String,
      enum: [
        "Draft",
        "Sent",
        "Accepted",
        "Rejected",
        "Expired",
        "Cancelled",
      ],
      default: "Draft",
      // index: true,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    // Audit references
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Quotation numbers are unique across this single-tenant application.
quotationSchema.index(
  { quotationNumber: 1 },
  { unique: true }
);

// Common CRM queries
quotationSchema.index({ customer: 1 });
quotationSchema.index({ lead: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ issueDate: -1 });

const Quotation =
  mongoose.models.Quotation ||
  mongoose.model("Quotation", quotationSchema);

export default Quotation;
