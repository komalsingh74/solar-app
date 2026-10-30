import mongoose from "mongoose";

const { Schema } = mongoose;
const applicationStages = ["Documents", "Applied", "Inspection", "Net meter", "Commissioned", "Subsidy received"];

const subsidyApplicationSchema = new Schema({
  applicationNumber: { type: String, required: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  systemSizeKw: { type: Number, required: true, min: 0.1 },
  scheme: { type: String, enum: ["PM Surya Ghar", "PM-KUSUM", "State subsidy", "No subsidy"], required: true },
  discom: { type: String, required: true, trim: true },
  portalApplicationNumber: { type: String, trim: true, default: "" },
  currentStage: { type: String, enum: applicationStages, default: "Documents", index: true },
  stageUpdatedAt: { type: Date, default: Date.now },
  expectedSubsidy: { type: Number, min: 0, default: 0 },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
  notes: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

subsidyApplicationSchema.index({ applicationNumber: 1 }, { unique: true });
subsidyApplicationSchema.index({ currentStage: 1, stageUpdatedAt: 1 });

export { applicationStages };
export default mongoose.models.SubsidyApplication || mongoose.model("SubsidyApplication", subsidyApplicationSchema);
