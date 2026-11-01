
import mongoose from "mongoose";

const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    // ==================================
    // 1. BASIC LEAD DETAILS
    // ==================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    customerType: {
      type: String,
      enum: [
        "Residential",
        "Commercial",
        "Industrial",
        "Government",
        "Mixed",
      ],
      default: "Residential",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================
    // 2. LEAD SOURCE & ASSIGNMENT
    // ==================================

    source: {
      type: Schema.Types.ObjectId,
      ref: "LeadSource",
      default: null,
    },

    assignedEmployee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==================================
    // 3. LEAD PIPELINE
    // ==================================

    stage: {
      type: String,
      enum: [
        "Lead",
        "Follow-up",
        "Site Visit",
        "Site Survey",
        "Quotation",
        "Negotiation",
        "Won",
        "Lost",
      ],
      default: "Lead",
    },

    // ==================================
    // 4. SOLAR REQUIREMENTS
    // ==================================

    systemSizeKw: {
      type: Number,
      min: 0,
      default: null,
    },

    monthlyElectricityBill: {
      type: Number,
      min: 0,
      default: null,
    },

    roofType: {
      type: String,
      trim: true,
      default: "",
    },

    availableArea: {
      type: Number,
      min: 0,
      default: null,
    },

    budget: {
      type: Number,
      min: 0,
      default: null,
    },

    financingRequirement: {
      type: String,
      trim: true,
      default: "",
    },

    customerRequirement: {
      type: String,
      trim: true,
      default: "",
    },

    additionalNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================
    // 5. QUOTATION DETAILS
    // ==================================

    quotations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Quotation",
      },
    ],

    quotationAmount: {
      type: Number,
      min: 0,
      default: null,
    },

    // ==================================
    // 6. CUSTOMER & PROJECT CONVERSION
    // ==================================

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "SolarProject",
      default: null,
    },

    convertedAt: {
      type: Date,
      default: null,
    },

    // ==================================
    // 7. LOST LEAD DETAILS
    // ==================================

    lostReason: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================
    // 8. AUDIT & STATUS
    // ==================================

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// ==================================
// INDEXES
// ==================================

// Pipeline filtering
leadSchema.index({ stage: 1 });

// Employee-wise lead filtering
leadSchema.index({
  assignedEmployee: 1,
  stage: 1,
});

// Search by phone
leadSchema.index({ phone: 1 });

// Converted customer lookup
leadSchema.index({ customerId: 1 });

// Latest leads
leadSchema.index({ createdAt: -1 });

// ==================================
// MODEL EXPORT
// ==================================

const Lead =
  mongoose.models.Lead ||
  mongoose.model("Lead", leadSchema);

export default Lead;
