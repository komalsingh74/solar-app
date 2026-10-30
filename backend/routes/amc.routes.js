import { Router } from "express";
import { amcOptions, createAmcContract, deleteAmcContract, listAmcContracts, logAmcVisit, renewAmcContract, updateAmcContract } from "../controllers/amc.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", amcOptions);
router.route("/").get(listAmcContracts).post(createAmcContract);
router.post("/:id/visits", logAmcVisit);
router.post("/:id/renew", renewAmcContract);
router.route("/:id").patch(updateAmcContract).delete(deleteAmcContract);
export default router;
