import { Router } from "express";
import multer from "multer";
import { createExpense, expenseOptions, listExpenses, updateExpenseStatus, uploadExpenseReceipt } from "../controllers/expense.controller.js";
import requireAuth from "../middleware/requireAuth.js";

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype)) {
      callback(new Error("Receipt must be a JPG, PNG, WebP image or PDF."));
      return;
    }
    callback(null, true);
  },
});

const router = Router();
router.use(requireAuth);
router.get("/options", expenseOptions);
router.post("/receipts", receiptUpload.single("receipt"), uploadExpenseReceipt);
router.route("/").get(listExpenses).post(createExpense);
router.patch("/:id/status", updateExpenseStatus);
export default router;
