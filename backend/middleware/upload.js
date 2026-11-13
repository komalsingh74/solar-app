
import multer from "multer";
import AppError from "../utils/AppError.js";

const createUpload = (allowedTypes, errorMessage) => multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError(errorMessage, 400, "INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

const upload = createUpload(
  ["image/jpeg", "image/png", "image/webp"],
  "Only JPG, PNG and WEBP images are allowed.",
);
const documentUpload = createUpload([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
], "Only JPG, PNG, WEBP images and PDF documents are allowed.");

export { upload, documentUpload };
