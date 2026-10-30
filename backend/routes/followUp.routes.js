import { Router } from "express";
import {
  createFollowUpTask,
  deleteFollowUpTask,
  followUpOptions,
  listFollowUpTasks,
  updateFollowUpTask,
} from "../controllers/followUp.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.get("/options", followUpOptions);
router.route("/").get(listFollowUpTasks).post(createFollowUpTask);
router.route("/:id").patch(updateFollowUpTask).delete(deleteFollowUpTask);
export default router;
