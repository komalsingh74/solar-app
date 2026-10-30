import Customer from "../../models/customerSchema.js";
import CallLog from "../../models/CallLog.js";
import Lead from "../../models/lead.js";
import Quotation from "../../models/quotation.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import createMasterCrudHandlers from "../../services/masters/masterCrud.service.js";

const customerHandlers = createMasterCrudHandlers({
  Model: Customer,
  searchFields: [
    "customerId", "customerName", "contactPerson", "phone", "email", "gstin",
    "installationAddress.city",
  ],
  fields: [
    "customerId", "customerType", "customerName", "contactPerson", "phone", "email",
    "gstin", "pan", "status", "installationAddress", "billingSameAsInstallation",
    "billingAddress", "siteData", "documents", "customDocumentTypes", "notes",
  ],
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
export const createCustomer = asyncHandler(customerHandlers.create);
export const updateCustomer = asyncHandler(customerHandlers.update);
export const deleteCustomer = asyncHandler(customerHandlers.remove);
