import { Router } from "express";
import {
  createQuotation,
  deleteQuotation,
  listQuotations,
  updateQuotation,
} from "../controllers/quotation.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.route("/").get(listQuotations).post(createQuotation);
router.route("/:id").patch(updateQuotation).delete(deleteQuotation);
export default router;
