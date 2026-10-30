import express from "express";
import { upload } from "../middleware/upload.js";
import { uploadImage } from "../controllers/upload.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.post(
  "/image",
  requireAuth,
  upload.single("image"),
  uploadImage
);

export default router;