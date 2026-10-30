import mongoose from "mongoose";

const { Schema } = mongoose;
const installmentSchema = new Schema({
  label: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  dueDate: { type: Date, required: true },
  source: { type: String, enum: ["Customer", "Loan"], required: true },
});

const paymentPlanSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: "SolarProject", required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  planType: { type: String, enum: ["Cash", "Milestone", "Kisht", "Finance"], required: true },
  totalAmount: { type: Number, required: true, min: 0.01 },
  installments: { type: [installmentSchema], default: [] },
  loanProvider: { type: String, trim: true, default: "" },
  loanApplicationNumber: { type: String, trim: true, default: "" },
  loanStatus: { type: String, enum: ["Applied", "Approved", "Rejected", "Disbursed"], default: "Applied" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

export default mongoose.models.PaymentPlan || mongoose.model("PaymentPlan", paymentPlanSchema);
