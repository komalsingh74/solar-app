import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import { dashboard, listCalls, lookupCaller, createFollowUp, listFollowUps, setFollowUpStatus } from "../controllers/call.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/dashboard", dashboard);
router.get("/logs", listCalls);
router.get("/lookup", lookupCaller);
router.get("/follow-ups", listFollowUps);
router.post("/follow-ups", createFollowUp);
router.patch("/follow-ups/:id", setFollowUpStatus);
export default router;
