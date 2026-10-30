import { Router } from "express";
import { createPayment, listPaymentAccounts, paymentOptions, savePaymentPlan } from "../controllers/payment.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", paymentOptions);
router.get("/accounts", listPaymentAccounts);
router.put("/accounts/:projectId/plan", savePaymentPlan);
router.post("/", createPayment);
export default router;
