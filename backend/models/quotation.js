
import mongoose from "mongoose";

const { Schema } = mongoose;

// Quotation line items
const quotationItemSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    // Snapshot of item details at quotation time
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
    // Quotation identification
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // CRM relationships
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

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
      enum: ["Single phase", "Three phase"],
      default: "Single phase",
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
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
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
    },

    sentAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    // Audit fields
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

// At least one CRM reference is required
quotationSchema.pre("validate", function () {
  if (!this.customer && !this.lead) {
    this.invalidate(
      "customer",
      "A customer or lead reference is required"
    );
  }

  if (
    this.issueDate &&
    this.validUntil &&
    this.validUntil < this.issueDate
  ) {
    this.invalidate(
      "validUntil",
      "Valid until date cannot be before issue date"
    );
  }
});

// Unique quotation number
quotationSchema.index(
  { quotationNumber: 1 },
  { unique: true }
);

// Customer quotation history
quotationSchema.index({
  customer: 1,
  issueDate: -1,
});

// Lead quotation history
quotationSchema.index({
  lead: 1,
  issueDate: -1,
});

// Project quotation lookup
quotationSchema.index({
  project: 1,
});

// Quotation dashboard
quotationSchema.index({
  status: 1,
  issueDate: -1,
});

const Quotation =
  mongoose.models.Quotation ||
  mongoose.model("Quotation", quotationSchema);

export default Quotation;
