
import mongoose from "mongoose";

const { Schema } = mongoose;

const leadSourceSchema = new Schema(
  {
    // ==================================
    // 1. SOURCE IDENTIFICATION
    // ==================================

    sourceName: {
      type: String,
      required: [true, "Source name is required"],
      trim: true,
    },
    normalizedSourceName: {
      type: String,
      select: false,
    },

    // ==================================
    // 2. SOURCE CHANNEL
    // ==================================

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

    // ==================================
    // 3. STATUS
    // ==================================

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // ==================================
    // 4. DESCRIPTION
    // ==================================

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================
    // 5. AUDIT FIELDS
    // ==================================

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

// ==================================
// INDEXES
// ==================================

leadSourceSchema.index(
  { normalizedSourceName: 1 },
  {
    unique: true,
    partialFilterExpression: { normalizedSourceName: { $type: "string" } },
  }
);

// Active / inactive filtering
leadSourceSchema.index({ status: 1 });

// Channel filtering
leadSourceSchema.index({ channel: 1 });

// ==================================
// MODEL EXPORT
// ==================================

const LeadSource =
  mongoose.models.LeadSource ||
  mongoose.model("LeadSource", leadSourceSchema);

export default LeadSource;
