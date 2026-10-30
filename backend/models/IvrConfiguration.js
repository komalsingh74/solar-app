import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  digit: { type: String, required: true, match: /^[0-9]$/ },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  prompt: { type: String, required: true, trim: true, maxlength: 200 },
  destinationType: { type: String, enum: ["department", "number", "queue"], required: true },
  destination: { type: String, required: true, trim: true, maxlength: 120 },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const ivrConfigurationSchema = new mongoose.Schema({
  name: { type: String, default: "Main number", trim: true, maxlength: 100 },
  virtualNumber: { type: String, default: "", trim: true },
  language: { type: String, default: "hi-IN", trim: true },
  greeting: { type: String, default: "", trim: true, maxlength: 500 },
  enabled: { type: Boolean, default: false },
  createLeadForUnknown: { type: Boolean, default: false },
  options: { type: [optionSchema], default: [] },
  invalidInput: { type: String, default: "replay_once", enum: ["replay_once", "operator", "hangup"] },
  fallbackNumber: { type: String, default: "", trim: true },
  businessHours: { type: String, default: "", trim: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

export default mongoose.models.IvrConfiguration || mongoose.model("IvrConfiguration", ivrConfigurationSchema);
