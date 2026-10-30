import mongoose from "mongoose";

const equipmentWarrantySchema = new mongoose.Schema({
  warrantyNumber: { type: String, required: true, trim: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null, index: true },
  itemName: { type: String, required: true, trim: true, maxlength: 150 },
  brand: { type: String, required: true, trim: true, maxlength: 150 },
  serialNumber: { type: String, required: true, trim: true, maxlength: 150 },
  installedAt: { type: Date, required: true },
  durationYears: { type: Number, required: true, min: 0.1, max: 100 },
  provider: { type: String, trim: true, default: "", maxlength: 150 },
  notes: { type: String, trim: true, default: "", maxlength: 2000 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

equipmentWarrantySchema.index({ serialNumber: 1 }, { unique: true });
equipmentWarrantySchema.index({ customer: 1, installedAt: -1 });

export default mongoose.models.EquipmentWarranty || mongoose.model("EquipmentWarranty", equipmentWarrantySchema);
