import mongoose from "mongoose";

const { Schema } = mongoose;
const purchaseLineSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.001 },
  rate: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, min: 0, default: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
});

const purchaseOrderSchema = new Schema({
  orderNumber: { type: String, required: true, trim: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  items: { type: [purchaseLineSchema], validate: [(items) => items.length > 0, "Add at least one purchase order item"] },
  orderedAt: { type: Date, default: Date.now },
  expectedAt: { type: Date, required: true },
  stage: { type: String, enum: ["Draft", "Ordered", "Received", "Billed", "Paid"], default: "Draft", index: true },
  amount: { type: Number, required: true, min: 0 },
  billNumber: { type: String, trim: true, default: "" },
  paidAt: { type: Date, default: null },
  notes: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

purchaseOrderSchema.index({ orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ stage: 1, expectedAt: 1 });

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);
