
import express from "express";
import userRoutes from "./userRoutes.js";
import uploadRoutes from "./upload.routes.js";
import masterRoutes from "./master.routes.js";
import leadRoutes from "./lead.routes.js";
import followUpRoutes from "./followUp.routes.js";
import quotationRoutes from "./quotation.routes.js";
import siteSurveyRoutes from "./siteSurvey.routes.js";
import solarProjectRoutes from "./solarProject.routes.js";
import subsidyRoutes from "./subsidy.routes.js";
import installationTeamRoutes from "./installationTeam.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import purchaseOrderRoutes from "./purchaseOrder.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import paymentRoutes from "./payment.routes.js";
import expenseRoutes from "./expense.routes.js";
import serviceTicketRoutes from "./serviceTicket.routes.js";
import amcRoutes from "./amc.routes.js";
import warrantyRoutes from "./warranty.routes.js";

const routes = express.Router();

routes.use("/users", userRoutes);
routes.use("/upload", uploadRoutes);
routes.use("/masters", masterRoutes);
routes.use("/leads", leadRoutes);
routes.use("/follow-ups", followUpRoutes);
routes.use("/quotations", quotationRoutes);
routes.use("/site-surveys", siteSurveyRoutes);
routes.use("/solar-projects", solarProjectRoutes);
routes.use("/subsidy-applications", subsidyRoutes);
routes.use("/installation-teams", installationTeamRoutes);
routes.use("/inventory", inventoryRoutes);
routes.use("/purchase-orders", purchaseOrderRoutes);
routes.use("/invoices", invoiceRoutes);
routes.use("/payments", paymentRoutes);
routes.use("/expenses", expenseRoutes);
routes.use("/service-tickets", serviceTicketRoutes);
routes.use("/amcs", amcRoutes);
routes.use("/warranties", warrantyRoutes);

export default routes;
