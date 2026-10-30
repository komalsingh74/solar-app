import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { getConfiguration, saveConfiguration, settingsStatus, saveProviderSettings, getMappingSettings, saveMappingSettings } from "../controllers/ivr.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/configuration", getConfiguration);
router.put("/configuration", requireAdmin, saveConfiguration);
router.get("/settings/status", requireAdmin, settingsStatus);
router.put("/settings/provider", requireAdmin, saveProviderSettings);
router.get("/mapping", getMappingSettings);
router.put("/mapping", requireAdmin, saveMappingSettings);
export default router;
