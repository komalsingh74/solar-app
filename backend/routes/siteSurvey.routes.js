import { Router } from "express";
import { createSiteSurvey, deleteSiteSurvey, listSiteSurveys, surveyOptions, updateSiteSurvey } from "../controllers/siteSurvey.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", surveyOptions);
router.route("/").get(listSiteSurveys).post(createSiteSurvey);
router.route("/:id").patch(updateSiteSurvey).delete(deleteSiteSurvey);
export default router;
