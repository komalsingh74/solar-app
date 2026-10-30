import mongoose from "mongoose";
import InventoryMovement from "../models/InventoryMovement.js";
import StockBalance from "../models/StockBalance.js";
import AppError from "../utils/AppError.js";

const changeBalance = async (item, warehouse, amount, userId) => {
  if (amount < 0) {
    const balance = await StockBalance.findOneAndUpdate(
      { item, warehouse, quantity: { $gte: -amount } },
      { $inc: { quantity: amount }, $set: { updatedBy: userId } },
      { new: true },
    );
    if (!balance) throw new AppError("Insufficient stock at the selected location", 409, "INSUFFICIENT_STOCK");
    return;
  }
  try {
    await StockBalance.findOneAndUpdate(
      { item, warehouse },
      { $inc: { quantity: amount }, $set: { updatedBy: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await StockBalance.updateOne({ item, warehouse }, { $inc: { quantity: amount }, $set: { updatedBy: userId } });
  }
};

export const recordInventoryMovement = async (values, userId) => {
  const { item, type, quantity, fromWarehouse = null, toWarehouse, reference = "", project = null, purchaseOrder = null, movementDate = new Date() } = values;
  if (!mongoose.isValidObjectId(item) || !mongoose.isValidObjectId(toWarehouse)) {
    throw new AppError("Select a valid item and destination warehouse", 400, "INVALID_MOVEMENT");
  }
  if (type !== "Received" && !mongoose.isValidObjectId(fromWarehouse)) {
    throw new AppError("Select a valid source warehouse", 400, "INVALID_MOVEMENT");
  }
  if (fromWarehouse && String(fromWarehouse) === String(toWarehouse)) {
    throw new AppError("Source and destination warehouses must differ", 400, "INVALID_MOVEMENT");
  }
  if (!["Received", "Issued", "Transfer", "Returned"].includes(type) || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    throw new AppError("Enter a valid movement type and positive quantity", 400, "INVALID_MOVEMENT");
  }

  const amount = Number(quantity);
  let sourceChanged = false;
  let destinationChanged = false;
  try {
    if (fromWarehouse) {
      await changeBalance(item, fromWarehouse, -amount, userId);
      sourceChanged = true;
    }
    await changeBalance(item, toWarehouse, amount, userId);
    destinationChanged = true;
    const [movement] = await InventoryMovement.create([{
      item, type, quantity: amount, fromWarehouse, toWarehouse, reference, project, purchaseOrder, movementDate, createdBy: userId,
    }]);
    return movement;
  } catch (error) {
    if (destinationChanged) await StockBalance.updateOne({ item, warehouse: toWarehouse }, { $inc: { quantity: -amount }, $set: { updatedBy: userId } });
    if (sourceChanged) await StockBalance.updateOne({ item, warehouse: fromWarehouse }, { $inc: { quantity: amount }, $set: { updatedBy: userId } });
    throw error;
  }
};

export const undoInventoryMovement = async (movement, userId) => {
  const amount = movement.quantity;
  await changeBalance(movement.item, movement.toWarehouse, -amount, userId);
  if (movement.fromWarehouse) await changeBalance(movement.item, movement.fromWarehouse, amount, userId);
  await InventoryMovement.deleteOne({ _id: movement._id });
};
