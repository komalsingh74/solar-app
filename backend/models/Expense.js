import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  expenseNumber: { type: String, required: true, trim: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  expenseDate: { type: Date, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  paidTo: { type: String, trim: true, default: "" },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Bank transfer", "Cheque"], required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  status: { type: String, enum: ["pending", "approved", "paid", "rejected"], default: "pending", index: true },
  receipt: {
    url: { type: String, trim: true, default: "" },
    publicId: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

expenseSchema.index({ expenseDate: -1 });

export default mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
