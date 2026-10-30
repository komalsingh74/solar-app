import mongoose from "mongoose";

const { Schema } = mongoose;

const solarProjectSchema = new Schema({
  projectCode: { type: String, required: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  lead: { type: Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
  siteSurvey: { type: Schema.Types.ObjectId, ref: "SiteSurvey", default: null, index: true },
  siteAddress: { type: String, trim: true, required: true },
  systemSizeKw: { type: Number, min: 0.1, required: true },
  stage: {
    type: String,
    enum: ["Survey approved", "Material dispatched", "Structure", "Panels mounted", "Wiring & inverter", "Net-meter & inspection", "Commissioned"],
    default: "Survey approved",
    index: true,
  },
  engineer: { type: Schema.Types.ObjectId, ref: "User", default: null },
  installationTeam: { type: Schema.Types.ObjectId, ref: "InstallationTeam", default: null },
  startDate: { type: Date, required: true },
  targetDate: { type: Date, required: true },
  netMeteringStatus: { type: String, enum: ["Not applied", "Applied", "Approved", "Installed"], default: "Not applied" },
  subsidyStatus: { type: String, enum: ["Not applicable", "Applied", "Approved", "Received"], default: "Not applicable" },
  notes: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

solarProjectSchema.index({ projectCode: 1 }, { unique: true });
solarProjectSchema.index({ stage: 1, targetDate: 1 });

export default mongoose.models.SolarProject || mongoose.model("SolarProject", solarProjectSchema);
