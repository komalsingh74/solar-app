import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  callLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog", required: true },
  phone: { type: String, required: true, trim: true },
  dueAt: { type: Date, required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  linkedTo: { type: String, enum: ["Lead", "Customer", "Unknown"], default: "Unknown" },
  linkedId: { type: mongoose.Schema.Types.ObjectId, default: null, refPath: "linkedTo" },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending", index: true },
  notes: { type: String, trim: true, default: "Missed inbound call callback" },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

followUpSchema.index({ callLogId: 1 }, { unique: true });
followUpSchema.index({ status: 1, dueAt: 1 });

export default mongoose.models.FollowUp || mongoose.model("FollowUp", followUpSchema);
