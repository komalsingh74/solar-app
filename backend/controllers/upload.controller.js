
import { Readable } from "node:stream";
import cloudinary, { assertCloudinaryConfigured } from "../config/cloudinary.js";

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from([buffer]).pipe(stream);
  });
}

export const uploadImage = async (req, res, next) => {
  try {
    // Check whether an image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    assertCloudinaryConfigured();

    const result = await uploadBuffer(req.file.buffer, {
      folder: `solar-panel-management/${req.auth.userId}/products`,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        {
          width: 1600,
          height: 1600,
          crop: "limit",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
