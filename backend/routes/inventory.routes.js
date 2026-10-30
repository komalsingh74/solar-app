import { Router } from "express";
import { createInventoryMovement, inventoryOptions, listInventoryMovements, listStock } from "../controllers/inventory.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", inventoryOptions);
router.get("/stock", listStock);
router.route("/movements").get(listInventoryMovements).post(createInventoryMovement);
export default router;
