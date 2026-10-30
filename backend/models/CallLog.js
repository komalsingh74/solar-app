import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
  provider: { type: String, trim: true, default: "unknown" },
  providerCallId: { type: String, required: true, trim: true },
  direction: { type: String, enum: ["inbound", "outbound"], required: true },
  from: { type: String, required: true, trim: true },
  to: { type: String, required: true, trim: true },
  normalizedFrom: { type: String, required: true, index: true },
  normalizedTo: { type: String, required: true },
  status: { type: String, enum: ["ringing", "answered", "missed", "busy", "failed", "completed", "no-answer"], default: "ringing", index: true },
  startedAt: { type: Date, required: true, index: true },
  answeredAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, min: 0, default: 0 },
  ivrChoice: { type: String, trim: true, default: "" },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  recordingUrl: { type: String, trim: true, default: "" },
  rawStatus: { type: String, trim: true, default: "" },
}, { timestamps: true, versionKey: false });

callLogSchema.index({ provider: 1, providerCallId: 1 }, { unique: true });
callLogSchema.index({ startedAt: -1 });
callLogSchema.index({ normalizedFrom: 1, startedAt: -1 });

export default mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
