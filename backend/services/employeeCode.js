import Sequence from "../models/Sequence.js";

export const nextEmployeeCode = async (Employee) => {
  const existing = await Employee.find({ employeeCode: { $type: "string" } })
    .select("employeeCode")
    .lean();
  const highest = existing.reduce((max, employee) => {
    const match = /^EMP-?(\d+)$/i.exec(employee.employeeCode.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  try {
    await Sequence.updateOne(
      { _id: "EMPLOYEE" },
      { $setOnInsert: { value: 0 } },
      { upsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
  await Sequence.updateOne({ _id: "EMPLOYEE" }, { $max: { value: highest } });
  const counter = await Sequence.findOneAndUpdate(
    { _id: "EMPLOYEE" },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
  return `EMP${String(counter.value).padStart(3, "0")}`;
};
