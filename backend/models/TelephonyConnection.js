import mongoose from "mongoose";

const telephonyConnectionSchema = new mongoose.Schema({
  provider: { type: String, required: true, trim: true, maxlength: 80 },
  accountId: { type: String, required: true, trim: true, maxlength: 160 },
  authTokenEncrypted: { type: String, required: true, select: false },
  webhookSecretEncrypted: { type: String, default: "", select: false },
  healthUrl: { type: String, default: "", trim: true, maxlength: 500 },
  virtualNumber: { type: String, default: "", trim: true, maxlength: 40 },
  connectedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

export default mongoose.models.TelephonyConnection || mongoose.model("TelephonyConnection", telephonyConnectionSchema);
