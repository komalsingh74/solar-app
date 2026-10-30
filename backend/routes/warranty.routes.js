import { Router } from "express";
import { createWarranty, deleteWarranty, listWarranties, updateWarranty, warrantyOptions } from "../controllers/warranty.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", warrantyOptions);
router.route("/").get(listWarranties).post(createWarranty);
router.route("/:id").patch(updateWarranty).delete(deleteWarranty);
export default router;
