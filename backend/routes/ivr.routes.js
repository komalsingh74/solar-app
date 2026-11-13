import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import { getConfiguration, saveConfiguration, settingsStatus, saveProviderSettings, getMappingSettings, saveMappingSettings } from "../controllers/ivr.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/configuration", getConfiguration);
router.put("/configuration", saveConfiguration);
router.get("/settings/status", settingsStatus);
router.put("/settings/provider", saveProviderSettings);
router.get("/mapping", getMappingSettings);
router.put("/mapping", saveMappingSettings);
export default router;
