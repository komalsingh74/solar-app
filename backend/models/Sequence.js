import mongoose from "mongoose";

const sequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
}, { versionKey: false });

export default mongoose.models.Sequence || mongoose.model("Sequence", sequenceSchema);
