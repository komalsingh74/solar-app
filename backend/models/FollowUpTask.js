import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const followUpTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["Call", "WhatsApp", "Site visit", "Quotation follow-up", "Payment reminder", "Document collection"],
    required: true,
  },
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  linkedTo: { type: String, enum: ["Lead", "Customer", "Project"], required: true },
  linkedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  linkName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  dueAt: { type: Date, required: true, index: true },
  time: { type: String, trim: true, default: "11:00" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending", index: true },
  notes: { type: String, trim: true, default: "" },
  activity: { type: [activitySchema], default: [] },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

followUpTaskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });
followUpTaskSchema.index({ linkName: 1, dueAt: 1 });

export default mongoose.models.FollowUpTask || mongoose.model("FollowUpTask", followUpTaskSchema);
