import "dotenv/config";
import mongoose from "mongoose";

mongoose.set("autoIndex", false);

const [
  { default: connectDB },
  { default: Employee },
  { default: User },
  { default: Lead },
  { default: FollowUp },
  { default: FollowUpTask },
  { default: InstallationTeam },
  { default: SolarProject },
  { default: SiteSurvey },
  { default: SubsidyApplication },
  { default: ServiceTicket },
  { default: CallLog },
  { nextEmployeeCode },
] = await Promise.all([
  import("../config/db.js"),
  import("../models/hrms/Employee.js"),
  import("../models/userSchema.js"),
  import("../models/lead.js"),
  import("../models/FollowUp.js"),
  import("../models/FollowUpTask.js"),
  import("../models/InstallationTeam.js"),
  import("../models/SolarProject.js"),
  import("../models/siteSurvey.js"),
  import("../models/SubsidyApplication.js"),
  import("../models/ServiceTicket.js"),
  import("../models/CallLog.js"),
  import("../services/employeeCode.js"),
]);

const singularAssignments = [
  [Lead, "assignedEmployee", "assignedEmployeeUserId", false],
  [FollowUp, "assignedTo", "assignedToUserId", false],
  [FollowUpTask, "assignedTo", "assignedToUserId", false],
  [InstallationTeam, "lead", "leadUserId", true],
  [SolarProject, "engineer", "engineerUserId", false],
  [SiteSurvey, "engineer", "engineerUserId", true],
  [SubsidyApplication, "owner", "ownerUserId", false],
  [ServiceTicket, "technician", "technicianUserId", false],
  [CallLog, "assignedTo", "assignedToUserId", false],
  [Employee, "reportsTo", "reportsToUserId", false],
];

const migrateAssignments = async () => {
  const [users, employees] = await Promise.all([
    User.find({}).select("_id employeeId email").lean(),
    Employee.collection.find({}, { projection: { _id: 1, email: 1 } }).toArray(),
  ]);
  const employeeIds = new Set(employees.map((employee) => String(employee._id)));
  const employeesByEmail = new Map();
  for (const employee of employees) {
    const email = typeof employee.email === "string" ? employee.email.trim().toLowerCase() : "";
    if (!email) continue;
    employeesByEmail.set(email, [...(employeesByEmail.get(email) ?? []), String(employee._id)]);
  }
  const userToEmployee = new Map();
  for (const user of users) {
    if (user.employeeId && employeeIds.has(String(user.employeeId))) {
      userToEmployee.set(String(user._id), String(user.employeeId));
      continue;
    }
    if (user.employeeId) continue;
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    const matches = employeesByEmail.get(email) ?? [];
    if (matches.length !== 1) continue;
    userToEmployee.set(String(user._id), matches[0]);
    await User.collection.updateOne(
      { _id: user._id, employeeId: null },
      { $set: { employeeId: new mongoose.Types.ObjectId(matches[0]) } },
    );
  }
  let converted = 0;
  let preservedAsUser = 0;

  for (const [model, employeeField, userField, required] of singularAssignments) {
    const docs = await model.collection.find({ [employeeField]: { $ne: null } })
      .project({ [employeeField]: 1, [userField]: 1 })
      .toArray();
    for (const doc of docs) {
      const currentId = String(doc[employeeField]);
      if (employeeIds.has(currentId)) continue;
      const employeeId = userToEmployee.get(currentId);
      if (employeeId) {
        await model.collection.updateOne({ _id: doc._id }, {
          $set: { [employeeField]: new mongoose.Types.ObjectId(employeeId) },
          ...(doc[userField] ? {} : { $unset: { [userField]: "" } }),
        });
        converted += 1;
      } else {
        const update = { $set: { [userField]: doc[userField] ?? doc[employeeField] } };
        if (!required) update.$set[employeeField] = null;
        await model.collection.updateOne({ _id: doc._id }, update);
        preservedAsUser += 1;
      }
    }
  }

  for (const doc of await InstallationTeam.collection.find({ members: { $type: "array" } })
    .project({ members: 1, memberUserIds: 1 }).toArray()) {
    const employeesInTeam = [];
    const usersInTeam = [...(doc.memberUserIds ?? [])];
    for (const memberId of doc.members) {
      const id = String(memberId);
      if (employeeIds.has(id)) employeesInTeam.push(memberId);
      else if (userToEmployee.has(id)) {
        employeesInTeam.push(new mongoose.Types.ObjectId(userToEmployee.get(id)));
        converted += 1;
      } else {
        if (!usersInTeam.some((userId) => String(userId) === id)) usersInTeam.push(memberId);
        preservedAsUser += 1;
      }
    }
    await InstallationTeam.collection.updateOne({ _id: doc._id }, {
      $set: { members: employeesInTeam, memberUserIds: usersInTeam },
    });
  }

  console.log(`Assignment migration complete. Converted ${converted} reference(s); preserved ${preservedAsUser} unresolved User reference(s).`);
};

try {
  await connectDB();
  const employees = await Employee.collection.find({})
    .project({ employeeCode: 1, createdAt: 1 })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  const seen = new Set();
  for (const employee of employees) {
    if (typeof employee.employeeCode !== "string" || !employee.employeeCode.trim()) continue;
    const normalized = employee.employeeCode.trim().toUpperCase();
    if (seen.has(normalized)) {
      throw new Error(`Duplicate employee code "${employee.employeeCode}" found. Resolve it before backfilling.`);
    }
    seen.add(normalized);
  }

  let backfilled = 0;
  for (const employee of employees) {
    if (typeof employee.employeeCode === "string" && employee.employeeCode.trim()) continue;
    const employeeCode = await nextEmployeeCode(Employee);
    await Employee.collection.updateOne({ _id: employee._id }, { $set: { employeeCode } });
    backfilled += 1;
  }

  await Employee.collection.createIndex({ employeeCode: 1 }, { unique: true, name: "employeeCode_1" });
  console.log(`Employee code backfill complete. Assigned ${backfilled} code(s); existing codes were preserved.`);
  await migrateAssignments();
} finally {
  await mongoose.disconnect();
}
