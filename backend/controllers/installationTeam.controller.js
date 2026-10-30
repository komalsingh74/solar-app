import mongoose from "mongoose";
import InstallationTeam from "../models/InstallationTeam.js";
import SolarProject from "../models/SolarProject.js";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const validId = mongoose.isValidObjectId;
const populateTeam = (query) => query
  .populate("lead", "name phone role")
  .populate("members", "name phone role")
  .populate("project", "projectCode systemSizeKw");

const prepareTeam = async (body, userId, existing) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("A JSON object is required", 400, "INVALID_BODY");
  const teamName = body.teamName ?? body.name ?? existing?.teamName ?? "";
  if (typeof teamName !== "string" || !teamName.trim()) throw new AppError("Team name is required", 400, "REQUIRED_FIELDS");
  const rawMembers = body.memberIds ?? (existing ? existing.members.map(String) : []);
  if (!Array.isArray(rawMembers) || rawMembers.length === 0 || rawMembers.some((id) => !validId(id))) {
    throw new AppError("Select at least one valid team member", 400, "INVALID_MEMBERS");
  }
  const memberIds = [...new Set(rawMembers.map(String))];
  if (memberIds.length !== rawMembers.length) throw new AppError("Team members must be unique", 400, "DUPLICATE_MEMBER");
  const leadId = body.leadId ?? (existing ? String(existing.lead) : "");
  if (!validId(leadId) || !memberIds.includes(String(leadId))) throw new AppError("Choose a team lead from the selected members", 400, "INVALID_LEAD");
  const users = await User.find({ _id: { $in: memberIds }, status: "Active" }).select("_id");
  if (users.length !== memberIds.length) throw new AppError("All team members must be active users", 400, "INACTIVE_MEMBER");

  const status = body.status ?? existing?.status ?? "Available";
  if (!["Available", "On site", "On leave"].includes(status)) throw new AppError("Choose a valid team status", 400, "INVALID_STATUS");
  const projectId = Object.hasOwn(body, "projectId") ? body.projectId || "" : existing?.project ? String(existing.project) : "";
  if (projectId && (!validId(projectId) || !await SolarProject.exists({ _id: projectId, isActive: true }))) throw new AppError("Select an active solar project", 400, "INVALID_PROJECT");
  if (status === "On site" && !projectId) throw new AppError("Assign a project to an on-site team", 400, "PROJECT_REQUIRED");
  const monthlyInstalledKw = Number(body.monthlyInstalledKw ?? existing?.monthlyInstalledKw ?? 0);
  const incentiveRatePerKw = Number(body.incentiveRatePerKw ?? existing?.incentiveRatePerKw ?? 400);
  if (!Number.isFinite(monthlyInstalledKw) || monthlyInstalledKw < 0 || !Number.isFinite(incentiveRatePerKw) || incentiveRatePerKw < 0) {
    throw new AppError("Installed capacity and incentive rate must be non-negative numbers", 400, "INVALID_INCENTIVE");
  }
  const occupied = await InstallationTeam.findOne({
    _id: { $ne: existing?._id ?? null },
    isActive: true,
    members: { $in: memberIds },
  }).select("teamName");
  if (occupied) throw new AppError(`A selected employee already belongs to ${occupied.teamName}`, 409, "MEMBER_ALREADY_ASSIGNED");
  return {
    teamName: teamName.trim(), lead: leadId, members: memberIds, project: projectId || null,
    status, monthlyInstalledKw, incentiveRatePerKw,
    vehicle: body.vehicle ?? existing?.vehicle ?? "",
    skills: body.skills ?? existing?.skills ?? "",
    updatedBy: userId,
    ...(!existing ? { createdBy: userId } : {}),
  };
};

export const installationTeamOptions = asyncHandler(async (_req, res) => {
  const [employees, projects] = await Promise.all([
    User.find({ status: "Active" }).select("_id name phone role").sort({ name: 1 }).lean(),
    SolarProject.find({ isActive: true }).select("_id projectCode systemSizeKw").sort({ projectCode: 1 }).lean(),
  ]);
  res.json({ success: true, data: { employees, projects } });
});

export const listInstallationTeams = asyncHandler(async (_req, res) => {
  const items = await populateTeam(InstallationTeam.find({ isActive: true }).sort({ teamName: 1 })).lean();
  res.json({ success: true, data: { items, pagination: { page: 1, limit: items.length, total: items.length, pages: 1 } } });
});

export const createInstallationTeam = asyncHandler(async (req, res) => {
  const item = await InstallationTeam.create(await prepareTeam(req.body, req.auth.userId, null));
  const populated = await populateTeam(InstallationTeam.findById(item._id));
  res.status(201).json({ success: true, data: { item: populated } });
});

export const updateInstallationTeam = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid team ID", 400, "INVALID_ID");
  const item = await InstallationTeam.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Installation team not found", 404, "TEAM_NOT_FOUND");
  Object.assign(item, await prepareTeam(req.body, req.auth.userId, item));
  await item.save();
  const populated = await populateTeam(InstallationTeam.findById(item._id));
  res.json({ success: true, data: { item: populated } });
});

export const deleteInstallationTeam = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new AppError("Invalid team ID", 400, "INVALID_ID");
  const item = await InstallationTeam.findOne({ _id: req.params.id, isActive: true });
  if (!item) throw new AppError("Installation team not found", 404, "TEAM_NOT_FOUND");
  if (await SolarProject.exists({ installationTeam: item._id, isActive: true })) throw new AppError("Team is assigned to an active project and cannot be deleted", 409, "RESOURCE_IN_USE");
  item.isActive = false;
  item.updatedBy = req.auth.userId;
  await item.save();
  res.json({ success: true, data: { id: item._id } });
});
