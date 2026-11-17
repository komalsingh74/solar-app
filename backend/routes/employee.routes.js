import { Router } from "express";
import {
  createEmployee,
  deactivateEmployee,
  employeeOptions,
  listEmployees,
  updateEmployee,
} from "../controllers/employee.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", employeeOptions);
router.route("/").get(listEmployees).post(createEmployee);
router.route("/:id").patch(updateEmployee).delete(deactivateEmployee);

export default router;
