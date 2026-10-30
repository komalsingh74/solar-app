import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { _id: false });

const serviceTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, trim: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  priority: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Medium", index: true },
  warrantyStatus: { type: String, enum: ["In warranty", "AMC", "Out of warranty"], default: "In warranty" },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["Open", "Assigned", "In progress", "Resolved"], default: "Open", index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  resolution: { type: String, trim: true, default: "", maxlength: 5000 },
  resolvedAt: { type: Date, default: null },
  activity: { type: [activitySchema], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

serviceTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.models.ServiceTicket || mongoose.model("ServiceTicket", serviceTicketSchema);
