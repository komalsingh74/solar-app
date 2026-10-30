import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, index: true },
  type: { type: String, enum: ["Received", "Issued", "Transfer", "Returned"], required: true, index: true },
  quantity: { type: Number, required: true, min: 0.001 },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  reference: { type: String, trim: true, default: "" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "SolarProject", default: null },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
  movementDate: { type: Date, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

inventoryMovementSchema.index({ item: 1, movementDate: -1 });

export default mongoose.models.InventoryMovement || mongoose.model("InventoryMovement", inventoryMovementSchema);
