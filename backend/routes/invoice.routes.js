import { Router } from "express";
import { createInvoice, deleteInvoice, invoiceOptions, listInvoices, sendInvoice, updateInvoice } from "../controllers/invoice.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", invoiceOptions);
router.route("/").get(listInvoices).post(createInvoice);
router.post("/:id/send", sendInvoice);
router.route("/:id").patch(updateInvoice).delete(deleteInvoice);
export default router;
