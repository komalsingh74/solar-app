import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  completedAt: { type: Date, default: Date.now },
  notes: { type: String, trim: true, default: "", maxlength: 2000 },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { _id: true });

const amcContractSchema = new mongoose.Schema({
  contractNumber: { type: String, required: true, trim: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", required: true, index: true },
  plan: { type: String, required: true, trim: true, maxlength: 100 },
  annualVisitAllowance: { type: Number, required: true, min: 1, max: 365 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  annualFee: { type: Number, required: true, min: 0 },
  visits: { type: [visitSchema], default: [] },
  renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "AmcContract", default: null },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

amcContractSchema.index({ project: 1, endDate: -1 });

export default mongoose.models.AmcContract || mongoose.model("AmcContract", amcContractSchema);
