import { Router } from "express";
import { createLead, deleteLead, leadOptions, listLeads, updateLead } from "../controllers/lead.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", leadOptions);
router.route("/").get(listLeads).post(createLead);
router.route("/:id").patch(updateLead).delete(deleteLead);
export default router;
