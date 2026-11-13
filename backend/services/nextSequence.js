import Sequence from "../models/Sequence.js";

const nextSequence = async (prefix, sequenceKey = prefix) => {
  const year = new Date().getFullYear();
  const sequence = await Sequence.findOneAndUpdate(
    { _id: `${sequenceKey}-${year}` },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
  return `${prefix.toUpperCase()}-${year}-${String(sequence.value).padStart(5, "0")}`;
};

export default nextSequence;
