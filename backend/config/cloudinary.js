import { v2 as cloudinary } from "cloudinary";
import AppError from "../utils/AppError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const assertCloudinaryConfigured = () => {
  const required = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  if (required.some((key) => !process.env[key]?.trim())) {
    throw new AppError("Cloudinary is not configured on the server.", 500, "CLOUDINARY_CONFIG_ERROR");
  }
};

export default cloudinary;