import mongoose from "mongoose";

const { Schema } = mongoose;

// Invoice line items
const invoiceItemSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      default: null,
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
      default: 0,
      min: 0,
      max: 100,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "SolarProject",
      default: null,
    },

    quotation: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    type: {
      type: String,
      enum: ["Tax Invoice", "Proforma"],
      required: true,
      default: "Tax Invoice",
    },

    issueDate: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Invoice must contain at least one item.",
      },
    },

    // Amount summary
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
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

    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Document status
    status: {
      type: String,
      enum: ["Draft", "Sent", "Cancelled"],
      default: "Draft",
      index: true,
    },

    // Payment status is separate from invoice status
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid", "Overdue"],
      default: "Unpaid",
      index: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    sentAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Date validation
invoiceSchema.pre("validate", function () {
  if (this.issueDate && this.dueDate && this.dueDate < this.issueDate) {
    this.invalidate("dueDate", "Due date cannot be before issue date.");
  }

  if (this.paidAmount > this.totalAmount) {
    this.invalidate("paidAmount", "Paid amount cannot exceed total amount.");
  }
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ project: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ paymentStatus: 1, dueDate: 1 });

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);
