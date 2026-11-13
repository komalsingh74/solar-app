import express from "express";
import {
  createMasterRecord,
  deleteMasterRecord,
  getMasterRecord,
  listMasterRecords,
  updateMasterRecord,
} from "../controllers/masters/master.controller.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  getCustomerDocument,
  uploadCustomerDocument,
  updateCustomer,
} from "../controllers/masters/customer.controller.js";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  listProductCategories,
  updateItem,
} from "../controllers/masters/item.controller.js";
import requireAuth from "../middleware/requireAuth.js";
import requireMasterPermission from "../middleware/requireMasterPermission.js";
import { documentUpload } from "../middleware/upload.js";

const masterRoutes = express.Router();

masterRoutes.use(requireAuth);
masterRoutes.get("/product-categories", requireMasterPermission("items"), listProductCategories);

masterRoutes
  .route("/customers")
  .get(requireMasterPermission("customers"), listCustomers)
  .post(requireMasterPermission("customers"), createCustomer);
masterRoutes
  .route("/customers/:id")
  .get(requireMasterPermission("customers"), getCustomer)
  .patch(requireMasterPermission("customers"), updateCustomer)
  .delete(requireMasterPermission("customers"), deleteCustomer);
masterRoutes.post(
  "/customers/:id/documents",
  requireMasterPermission("customers"),
  documentUpload.single("document"),
  uploadCustomerDocument
);
masterRoutes.get(
  "/customers/:id/documents/:documentId/content",
  requireMasterPermission("customers"),
  getCustomerDocument
);

masterRoutes
  .route("/items")
  .get(requireMasterPermission("items"), listItems)
  .post(requireMasterPermission("items"), createItem);
masterRoutes
  .route("/items/:id")
  .get(requireMasterPermission("items"), getItem)
  .patch(requireMasterPermission("items"), updateItem)
  .delete(requireMasterPermission("items"), deleteItem);

for (const resource of [
  "lead-sources",
  "suppliers",
  "warehouses",
  "expense-categories",
]) {
  masterRoutes
    .route(`/${resource}`)
    .get(requireMasterPermission(resource), listMasterRecords(resource))
    .post(requireMasterPermission(resource), createMasterRecord(resource));

  masterRoutes
    .route(`/${resource}/:id`)
    .get(requireMasterPermission(resource), getMasterRecord(resource))
    .patch(requireMasterPermission(resource), updateMasterRecord(resource))
    .delete(requireMasterPermission(resource), deleteMasterRecord(resource));
}

export default masterRoutes;
