import { Router } from "express";
import { createSubsidyApplication, deleteSubsidyApplication, listSubsidyApplications, subsidyOptions, updateSubsidyApplication } from "../controllers/subsidy.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", subsidyOptions);
router.route("/").get(listSubsidyApplications).post(createSubsidyApplication);
router.route("/:id").patch(updateSubsidyApplication).delete(deleteSubsidyApplication);
export default router;
