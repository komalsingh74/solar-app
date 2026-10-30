import { Router } from "express";
import { createSolarProject, deleteSolarProject, listSolarProjects, solarProjectOptions, updateSolarProject } from "../controllers/solarProject.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", solarProjectOptions);
router.route("/").get(listSolarProjects).post(createSolarProject);
router.route("/:id").patch(updateSolarProject).delete(deleteSolarProject);
export default router;
