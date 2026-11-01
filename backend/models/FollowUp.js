
import mongoose from "mongoose";

const { Schema } = mongoose;

const followUpSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: ["Lead", "Customer", "IVR", "Manual"],
      default: "Manual",
    },

    type: {
      type: String,
      enum: ["Call", "WhatsApp", "Visit", "Email", "Task"],
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

    // Optional IVR call reference
    callLogId: {
      type: Schema.Types.ObjectId,
      ref: "CallLog",
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    dueAt: {
      type: Date,
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // CRM relationships
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
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

    completedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Employee task listing
followUpSchema.index({
  assignedTo: 1,
  status: 1,
  dueAt: 1,
});

// Lead follow-up history
followUpSchema.index({
  leadId: 1,
  dueAt: -1,
});

// Prevent duplicate IVR callbacks
followUpSchema.index(
  { callLogId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      callLogId: { $type: "objectId" },
    },
  }
);

export default mongoose.models.FollowUp ||
  mongoose.model("FollowUp", followUpSchema);
