import express from "express";
import {
  createMasterRecord,
  deleteMasterRecord,
  listMasterRecords,
  updateMasterRecord,
} from "../controllers/masters/master.controller.js";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "../controllers/masters/customer.controller.js";
import {
  createItem,
  deleteItem,
  listItems,
  listProductCategories,
  updateItem,
} from "../controllers/masters/item.controller.js";
import requireAuth from "../middleware/requireAuth.js";
import requireMasterPermission from "../middleware/requireMasterPermission.js";

const masterRoutes = express.Router();

masterRoutes.use(requireAuth);
masterRoutes.get("/product-categories", requireMasterPermission("items"), listProductCategories);

masterRoutes
  .route("/customers")
  .get(requireMasterPermission("customers"), listCustomers)
  .post(requireMasterPermission("customers"), createCustomer);
masterRoutes
  .route("/customers/:id")
  .patch(requireMasterPermission("customers"), updateCustomer)
  .delete(requireMasterPermission("customers"), deleteCustomer);

masterRoutes
  .route("/items")
  .get(requireMasterPermission("items"), listItems)
  .post(requireMasterPermission("items"), createItem);
masterRoutes
  .route("/items/:id")
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
    .patch(requireMasterPermission(resource), updateMasterRecord(resource))
    .delete(requireMasterPermission(resource), deleteMasterRecord(resource));
}

export default masterRoutes;
