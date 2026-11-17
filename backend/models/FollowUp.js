
import mongoose from "mongoose";

const { Schema } = mongoose;

const activitySchema = new Schema({
  text: { type: String, required: true, trim: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const followUpSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    linkName: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: ["Lead", "Customer", "IVR", "Manual"],
      default: "Manual",
    },

    stage: {
      type: String,
      trim: true,
      default: "",
    },

    linkedTo: {
      type: String,
      trim: true,
      default: "",
    },

    linkedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    type: {
      type: String,
      enum: [
        "Call", "WhatsApp", "Visit", "Email", "Task",
        "Site visit", "Quotation follow-up", "Payment reminder", "Document collection",
      ],
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

    reminderAt: {
      type: Date,
      default: null,
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
      ref: "Employee",
      default: null,
    },
    assignedToUserId: {
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

    activity: {
      type: [activitySchema],
      default: [],
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
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

// Customer follow-up history
followUpSchema.index({
  customerId: 1,
  dueAt: -1,
});

// Reminder listing
followUpSchema.index({
  reminder: 1,
  reminderAt: 1,
  status: 1,
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

const FollowUp =
  mongoose.models.FollowUp ||
  mongoose.model("FollowUp", followUpSchema);

export default FollowUp;
 