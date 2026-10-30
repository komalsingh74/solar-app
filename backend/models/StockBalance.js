import mongoose from "mongoose";

const stockBalanceSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

stockBalanceSchema.index({ item: 1, warehouse: 1 }, { unique: true });

export default mongoose.models.StockBalance || mongoose.model("StockBalance", stockBalanceSchema);
