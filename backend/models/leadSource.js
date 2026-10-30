
import mongoose from "mongoose";

const leadSourceSchema = new mongoose.Schema(
  {
    // Source name: Website, Facebook Ad, Referral, etc.
    sourceName: {
      type: String,
      required: [true, "Source name is required"],
      trim: true,
    },

    // Channel
    channel: {
      type: String,
      enum: [
        "Online",
        "Offline",
        "Referral",
        "Partner",
        "Other",
      ],
      required: true,
      default: "Online",
    },

    // Source status
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // Description
    description: {
      type: String,
      trim: true,
      default: "",
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

// Source names are unique across this single-tenant application.
leadSourceSchema.index({ sourceName: 1 }, { unique: true });

// Common queries
leadSourceSchema.index({ status: 1 });

const LeadSource =
  mongoose.models.LeadSource ||
  mongoose.model("LeadSource", leadSourceSchema);

export default LeadSource;
