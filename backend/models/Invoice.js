import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  type: { type: String, enum: ["Tax invoice", "Proforma"], required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  taxableAmount: { type: Number, required: true, min: 0.01 },
  gstRate: { type: Number, required: true, min: 0, max: 100 },
  gstAmount: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Draft", "Sent", "Cancelled"], default: "Draft", index: true },
  notes: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ status: 1, dueDate: 1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
