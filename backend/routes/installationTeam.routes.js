import { Router } from "express";
import { createInstallationTeam, deleteInstallationTeam, installationTeamOptions, listInstallationTeams, updateInstallationTeam } from "../controllers/installationTeam.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", installationTeamOptions);
router.route("/").get(listInstallationTeams).post(createInstallationTeam);
router.route("/:id").patch(updateInstallationTeam).delete(deleteInstallationTeam);
export default router;
