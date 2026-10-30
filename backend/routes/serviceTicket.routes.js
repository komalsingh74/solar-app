import { Router } from "express";
import { createServiceTicket, deleteServiceTicket, listServiceTickets, serviceTicketOptions, updateServiceTicket, updateServiceTicketStatus } from "../controllers/serviceTicket.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", serviceTicketOptions);
router.route("/").get(listServiceTickets).post(createServiceTicket);
router.patch("/:id/status", updateServiceTicketStatus);
router.route("/:id").patch(updateServiceTicket).delete(deleteServiceTicket);
export default router;
