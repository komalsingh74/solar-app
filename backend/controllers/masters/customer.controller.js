import Customer from "../../models/customerSchema.js";
import CallLog from "../../models/CallLog.js";
import Lead from "../../models/lead.js";
import Quotation from "../../models/quotation.js";
import mongoose from "mongoose";
import { Readable } from "node:stream";
import { basename } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import cloudinary, { assertCloudinaryConfigured } from "../../config/cloudinary.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import createMasterCrudHandlers from "../../services/masters/masterCrud.service.js";
import nextSequence from "../../services/nextSequence.js";

const customerFields = [
  "customerId", "customerType", "customerName", "contactPerson", "phone", "email",
  "gstin", "pan", "status", "installationAddress", "billingSameAsInstallation",
  "billingAddress", "siteData", "documents", "customDocumentTypes", "notes",
];

const customerHandlers = createMasterCrudHandlers({
  Model: Customer,
  searchFields: [
    "customerId", "customerName", "contactPerson", "phone", "email", "gstin",
    "installationAddress.city",
  ],
  fields: customerFields,
  prepare: async (body, _userId, existing) => ({
    ...Object.fromEntries(customerFields.filter((field) => field !== "customerId" && Object.hasOwn(body, field)).map((field) => [field, body[field]])),
    customerId: existing?.customerId ?? await nextSequence("CUS"),
  }),
  beforeDelete: async (id) => {
    const [lead, quotation, call] = await Promise.all([
      Lead.exists({ customerId: id }),
      Quotation.exists({ customer: id }),
      CallLog.exists({ customerId: id }),
    ]);
    if (lead || quotation || call) {
      throw new AppError("Customer is linked to CRM or quotation records and cannot be deleted", 409, "RESOURCE_IN_USE");
    }
  },
});

export const listCustomers = asyncHandler(customerHandlers.list);
export const getCustomer = asyncHandler(customerHandlers.get);
export const createCustomer = asyncHandler(customerHandlers.create);
export const updateCustomer = asyncHandler(customerHandlers.update);
export const deleteCustomer = asyncHandler(customerHandlers.remove);

const allowedDocumentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const uploadBuffer = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) return reject(error);
    if (!result) return reject(new Error("Cloudinary did not return an upload result."));
    resolve(result);
  });
  Readable.from([buffer]).pipe(stream);
});

export const uploadCustomerDocument = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Invalid customer ID", 400, "INVALID_ID");
  }
  if (!req.file) {
    throw new AppError("Select a JPG, PNG, WEBP or PDF document.", 400, "FILE_REQUIRED");
  }

  const documentName = typeof req.body.documentName === "string"
    ? req.body.documentName.trim()
    : "";
  if (!documentName || documentName.length > 100) {
    throw new AppError("A document name of up to 100 characters is required.", 400, "INVALID_DOCUMENT_NAME");
  }

  const detectedFile = await fileTypeFromBuffer(req.file.buffer);
  if (!detectedFile || !allowedDocumentTypes.has(detectedFile.mime) || detectedFile.mime !== req.file.mimetype) {
    throw new AppError("The selected file is not a supported image or PDF.", 400, "INVALID_FILE_TYPE");
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }
  assertCloudinaryConfigured();

  const resourceType = detectedFile.mime === "application/pdf" ? "raw" : "image";
  const uploaded = await uploadBuffer(req.file.buffer, {
    folder: `solar-panel-management/customers/${customer._id}/documents`,
    resource_type: resourceType,
    type: "authenticated",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
  });
  const safeFileName = basename(req.file.originalname.replace(/\\/g, "/")).slice(0, 255);
  const previous = customer.documents.find((document) => document.documentName === documentName);
  const previousPublicId = previous?.publicId;
  const previousResourceType = previous?.resourceType;
  const previousAccessType = previous?.accessType;
  const documentData = {
    documentName,
    documentType: ({
      "PAN card": "PAN_CARD",
      "GST certificate": "GST_CERTIFICATE",
      "Electricity bill": "ELECTRICITY_BILL",
      "Signed quotation": "SIGNED_QUOTATION",
      "Aadhaar card": "AADHAAR",
    })[documentName] ?? "OTHER",
    fileUrl: "",
    publicId: uploaded.public_id,
    downloadUrl: "",
    resourceType: uploaded.resource_type,
    accessType: uploaded.type,
    format: uploaded.format,
    originalFileName: safeFileName,
    mimeType: detectedFile.mime,
    fileSize: req.file.size,
    status: "Pending",
    uploadedAt: new Date(),
    verifiedAt: null,
    isRequired: previous?.isRequired ?? false,
  };

  if (previous) Object.assign(previous, documentData);
  else customer.documents.push(documentData);
  customer.updatedBy = req.auth.userId;

  try {
    await customer.save();
  } catch (error) {
    try {
      await cloudinary.uploader.destroy(uploaded.public_id, {
        resource_type: uploaded.resource_type,
        type: uploaded.type,
      });
    } catch (cleanupError) {
      console.error("[CLOUDINARY UPLOAD CLEANUP ERROR]", cleanupError.message);
    }
    throw error;
  }

  if (previousPublicId && previousPublicId !== uploaded.public_id) {
    try {
      await cloudinary.uploader.destroy(previousPublicId, {
        resource_type: previousResourceType || "image",
        type: previousAccessType || "upload",
      });
    } catch (cleanupError) {
      console.error("[CLOUDINARY REPLACED DOCUMENT CLEANUP ERROR]", cleanupError.message);
    }
  }

  res.status(200).json({ success: true, data: { item: customer } });
});

export const getCustomerDocument = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.documentId)) {
    throw new AppError("Invalid customer document ID", 400, "INVALID_ID");
  }

  const customer = await Customer.findById(req.params.id).select("documents");
  if (!customer) throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  const document = customer.documents.id(req.params.documentId);
  if (!document?.publicId) {
    throw new AppError("Customer document not found", 404, "DOCUMENT_NOT_FOUND");
  }
  assertCloudinaryConfigured();

  const resourceType = document.resourceType || (document.mimeType === "application/pdf" ? "raw" : "image");
  const accessType = document.accessType || "upload";
  const deliveryUrl = cloudinary.url(document.publicId, {
    secure: true,
    resource_type: resourceType,
    type: accessType,
    sign_url: accessType === "authenticated",
    ...(resourceType === "image" && document.format ? { format: document.format } : {}),
  });
  const remote = await fetch(deliveryUrl);
  if (!remote.ok) {
    throw new AppError("The document could not be retrieved from Cloudinary.", 502, "DOCUMENT_DELIVERY_FAILED");
  }

  const fileName = (document.originalFileName || document.documentName).replace(/[\r\n"]/g, "_");
  const disposition = req.query.download === "true" ? "attachment" : "inline";
  const body = Buffer.from(await remote.arrayBuffer());
  res.set({
    "Content-Type": document.mimeType || remote.headers.get("content-type") || "application/octet-stream",
    "Content-Length": String(body.length),
    "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.status(200).send(body);
});
