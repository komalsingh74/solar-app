import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, trim: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  mode: { type: String, enum: ["UPI", "Bank transfer", "Cheque", "Cash", "Subsidy (DBT)", "Loan disbursement"], required: true },
  source: { type: String, enum: ["Customer", "Loan"], required: true },
  paymentDate: { type: Date, required: true },
  reference: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ project: 1, paymentDate: -1 });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
