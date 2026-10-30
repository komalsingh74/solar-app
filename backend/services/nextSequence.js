import Sequence from "../models/Sequence.js";

const nextSequence = async (prefix) => {
  const year = new Date().getFullYear();
  const sequence = await Sequence.findOneAndUpdate(
    { _id: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `${prefix.toUpperCase()}-${year}-${String(sequence.value).padStart(5, "0")}`;
};

export default nextSequence;
