import { Router } from "express";
import { advancePurchaseOrder, createPurchaseOrder, deletePurchaseOrder, listPurchaseOrders, purchaseOrderOptions, updatePurchaseOrder } from "../controllers/purchaseOrder.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", purchaseOrderOptions);
router.route("/").get(listPurchaseOrders).post(createPurchaseOrder);
router.post("/:id/advance", advancePurchaseOrder);
router.route("/:id").patch(updatePurchaseOrder).delete(deletePurchaseOrder);
export default router;
