
import mongoose from "mongoose";

const { Schema } = mongoose;

const followUpSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    type: {
      type: String,
      enum: ["Call", "WhatsApp", "Visit", "Email"],
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    reminder: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    outcome: {
      type: String,
      trim: true,
      default: "",
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const leadSchema = new Schema(
  {
    // Lead basic details
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

    // Lead source master reference
source: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "LeadSource",
  default: null,
},

    // Employee responsible for the lead
    assignedEmployee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Lead pipeline stage
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
      index: true,
    },

    // Solar requirements
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

    // Upcoming follow-up summary
    nextFollowUp: {
      date: {
        type: Date,
        default: null,
      },

      type: {
        type: String,
        enum: ["Call", "WhatsApp", "Visit", "Email"],
        default: "Call",
      },

      priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium",
      },

      reminder: {
        type: Boolean,
        default: false,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Follow-up history
    followUps: {
      type: [followUpSchema],
      default: [],
    },

    // Separate quotation documents
    quotations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Quotation",
      },
    ],

    // Optional latest quotation amount for quick display
    quotationAmount: {
      type: Number,
      min: 0,
      default: null,
    },

    // Populated after conversion
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

    lostReason: {
      type: String,
      trim: true,
      default: "",
    },

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
  }
);

// Useful indexes for CRM filtering
leadSchema.index({ stage: 1 });
leadSchema.index({ assignedEmployee: 1 });
leadSchema.index({ "nextFollowUp.date": 1 });
leadSchema.index({ phone: 1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
