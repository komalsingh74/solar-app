import mongoose from "mongoose";

const { Schema } = mongoose;

const installationTeamSchema = new Schema({
  teamName: { type: String, required: true, trim: true },
  lead: { type: Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  vehicle: { type: String, trim: true, default: "" },
  skills: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["Available", "On site", "On leave"], default: "Available", index: true },
  project: { type: Schema.Types.ObjectId, ref: "SolarProject", default: null },
  monthlyInstalledKw: { type: Number, min: 0, default: 0 },
  incentiveRatePerKw: { type: Number, min: 0, default: 400 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

installationTeamSchema.index({ teamName: 1 }, { unique: true });

export default mongoose.models.InstallationTeam || mongoose.model("InstallationTeam", installationTeamSchema);
