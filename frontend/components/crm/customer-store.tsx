"use client";

import { useEffect, useState } from "react";
import { d } from "@/components/master/module-kit";
import api from "@/lib/api";
import { showError } from "@/lib/toast";

export const ME = "Sumit Saxena";
export const TYPES = ["Residential", "Commercial", "Industrial"];
export const DISCOMS = ["DVVNL", "PVVNL", "MVVNL", "PuVVNL", "KESCO", "Other"];
export const ROOFS = ["RCC", "Tin shed", "Asbestos", "Ground mount"];
export const OWNERS = ["Rohit Sharma", "Neha Verma", "Imran Khan"];
export const STAGES = ["Survey approved", "Material dispatched", "Structure", "Panels mounted", "Wiring & inverter", "Net-meter & inspection", "Commissioned"];

export type DocRec = { type: string; file: string; status: "Pending" | "Verified" | "Rejected"; on: string; by: string };
export type Project = { code: string; kw: number; stage: string; engineer: string; crew: string; target: string };
export type Quote = { no: string; date: string; amount: number; status: "Sent" | "Accepted" | "Rejected" };
export type Pay = { date: string; amount: number; mode: string; ref: string };
export type Complaint = { code: string; issue: string; status: string; date: string };
export type Activity = { title: string; meta: string };
export type Addr = { line: string; city: string; state: string; pincode: string };
export type Customer = {
  id: number; apiId?: string; code: string; name: string; contact: string; phone: string; email: string; type: string; gstin: string; pan: string;
  address: string; city: string; state: string; pincode: string; notes: string; billingSame: boolean; billing: Addr; customDocs: string[];
  consumerNo: string; discom: string; load: string; roof: string; status: "Active" | "Inactive";
  docs: DocRec[]; createdOn: string; updatedOn: string; updatedBy: string;
  owner: string; projects: Project[]; quotes: Quote[]; payments: Pay[]; complaints: Complaint[]; activity: Activity[];
};
export type CStore = { customers: Customer[] };

/* ---------- derived ---------- */
export const requiredDocs = (type: string) => (type === "Residential" ? ["Aadhaar card", "Electricity bill", "Signed quotation", "Net-metering form"] : ["PAN card", "GST certificate", "Electricity bill", "Signed quotation", "Net-metering form"]);
export const docState = (c: Customer) => {
  const req = requiredDocs(c.type), have = c.docs.filter((x) => req.includes(x.type));
  const missing = req.length - have.length, rejected = have.filter((x) => x.status === "Rejected").length, pending = have.filter((x) => x.status === "Pending").length;
  const status = missing > 0 ? "Missing documents" : rejected > 0 ? "Re-upload needed" : pending > 0 ? "Pending verification" : "Verified";
  return { have: have.length, total: req.length, missing, status };
};
export const biz = (c: Customer) => {
  const order = c.quotes.filter((q) => q.status === "Accepted").reduce((t, q) => t + q.amount, 0);
  const received = c.payments.reduce((t, p) => t + p.amount, 0);
  const active = c.projects.filter((p) => p.stage !== STAGES[STAGES.length - 1]);
  const outstanding = Math.max(0, order - received);
  const stage = !order ? "Prospect" : active.length ? "In installation" : outstanding > 0 ? "Payment due" : "Completed";
  return { order, received, outstanding, active, openComplaints: c.complaints.filter((x) => x.status !== "Resolved").length, stage, kw: c.projects.reduce((t, p) => t + p.kw, 0) };
};
export const withDoc = (c: Customer, type: string, doc: DocRec | null, note: string): Customer => ({
  ...c, docs: doc ? [...c.docs.filter((x) => x.type !== type), doc] : c.docs, updatedOn: d(0), updatedBy: ME,
  activity: [{ title: note, meta: `Today · ${ME}` }, ...c.activity],
});

/* ---------- customer defaults ---------- */
const base = { email: "", pan: "", gstin: "", state: "Uttar Pradesh", notes: "", billingSame: true, billing: { line: "", city: "", state: "Uttar Pradesh", pincode: "" }, customDocs: [] as string[], consumerNo: "", discom: "DVVNL", load: "", roof: "RCC", status: "Active" as const, docs: [] as DocRec[], createdOn: "", updatedOn: "", updatedBy: ME, owner: "", projects: [] as Project[], quotes: [] as Quote[], payments: [] as Pay[], complaints: [] as Complaint[], activity: [] as Activity[] };

/* ---------- API-backed shared store ---------- */
let state: CStore = { customers: [] };
let customerApiLoaded = false;
let customerApiLoading = true;
let customerApiError = "";
let customerLoad: Promise<void> | null = null;
let customerMutationQueue: Promise<void> = Promise.resolve();
const subs = new Set<() => void>();
export const blobs = new Map<string, string>();

const normalizeCustomer = (value: Partial<Customer>, index: number): Customer => ({
  ...base,
  ...value,
  id: Number(value.id) || Date.now() + index,
  apiId: value.apiId,
  code: value.code ?? `CUS-${String(index + 1).padStart(3, "0")}`,
  name: value.name ?? "", contact: value.contact ?? "", phone: value.phone ?? "", email: value.email ?? "",
  notes: value.notes ?? "",
  type: value.type ?? "Residential", gstin: value.gstin ?? "", pan: value.pan ?? "",
  address: value.address ?? "", city: value.city ?? "", state: value.state ?? "Uttar Pradesh", pincode: value.pincode ?? "",
  billingSame: value.billingSame ?? true,
  billing: { line: "", city: "", state: "Uttar Pradesh", pincode: "", ...(value.billing ?? {}) },
  customDocs: Array.isArray(value.customDocs) ? value.customDocs : [],
  docs: Array.isArray(value.docs) ? value.docs : [], projects: Array.isArray(value.projects) ? value.projects : [],
  quotes: Array.isArray(value.quotes) ? value.quotes : [], payments: Array.isArray(value.payments) ? value.payments : [],
  complaints: Array.isArray(value.complaints) ? value.complaints : [], activity: Array.isArray(value.activity) ? value.activity : [],
});

const dateOnly = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const apiToCustomer = (record: Record<string, unknown>, existing: Customer | undefined, index: number) => {
  const installation = (record.installationAddress ?? {}) as Record<string, unknown>;
  const billing = (record.billingAddress ?? {}) as Record<string, unknown>;
  const site = (record.siteData ?? {}) as Record<string, unknown>;
  const documents = Array.isArray(record.documents) ? record.documents as Record<string, unknown>[] : [];
  return normalizeCustomer({
    ...existing,
    id: existing?.id ?? index + 1,
    apiId: String(record._id ?? ""),
    code: String(record.customerId ?? ""),
    type: String(record.customerType ?? "Residential"),
    name: String(record.customerName ?? ""),
    contact: String(record.contactPerson ?? ""),
    phone: String(record.phone ?? ""),
    email: String(record.email ?? ""),
    notes: String(record.notes ?? ""),
    activity: existing?.activity ?? String(record.notes ?? "")
      .split("\n")
      .filter(Boolean)
      .map((title) => ({ title, meta: "Saved note" })),
    gstin: String(record.gstin ?? ""),
    pan: String(record.pan ?? ""),
    status: record.status === "Inactive" ? "Inactive" : "Active",
    address: String(installation.address ?? ""),
    city: String(installation.city ?? ""),
    state: String(installation.state ?? "Uttar Pradesh"),
    pincode: String(installation.pincode ?? ""),
    billingSame: record.billingSameAsInstallation !== false,
    billing: {
      line: String(billing.address ?? ""),
      city: String(billing.city ?? ""),
      state: String(billing.state ?? "Uttar Pradesh"),
      pincode: String(billing.pincode ?? ""),
    },
    consumerNo: String(site.electricityConsumerNumber ?? ""),
    discom: String(site.discom ?? "DVVNL"),
    load: site.sanctionedLoad == null ? "" : String(site.sanctionedLoad),
    roof: String(site.roofType ?? "RCC"),
    docs: documents.map((document) => ({
      type: String(document.documentName ?? ""),
      file: String(document.originalFileName ?? document.documentName ?? ""),
      status: document.status === "Verified" || document.status === "Rejected" ? document.status : "Pending",
      on: dateOnly(document.uploadedAt),
      by: existing?.updatedBy ?? ME,
    })),
    customDocs: Array.isArray(record.customDocumentTypes)
      ? record.customDocumentTypes.filter((value): value is string => typeof value === "string")
      : existing?.customDocs ?? [],
    createdOn: dateOnly(record.createdAt),
    updatedOn: dateOnly(record.updatedAt),
    updatedBy: existing?.updatedBy ?? ME,
  }, index);
};

const apiDocumentType = (name: string) => ({
  "PAN card": "PAN_CARD",
  "GST certificate": "GST_CERTIFICATE",
  "Electricity bill": "ELECTRICITY_BILL",
  "Signed quotation": "SIGNED_QUOTATION",
  "Aadhaar card": "AADHAAR",
}[name] ?? "OTHER");

const customerToApi = (customer: Customer) => ({
  customerId: customer.code,
  customerType: customer.type,
  customerName: customer.name,
  contactPerson: customer.contact,
  phone: customer.phone,
  email: customer.email,
  gstin: customer.gstin,
  pan: customer.pan,
  status: customer.status,
  notes: customer.notes,
  installationAddress: {
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
  },
  billingSameAsInstallation: customer.billingSame,
  billingAddress: {
    address: customer.billing.line,
    city: customer.billing.city,
    state: customer.billing.state,
    pincode: customer.billing.pincode,
  },
  siteData: {
    electricityConsumerNumber: customer.consumerNo,
    discom: customer.discom,
    sanctionedLoad: customer.load ? Number(customer.load) : null,
    roofType: customer.roof,
  },
  documents: customer.docs.map((document) => ({
    documentName: document.type,
    documentType: apiDocumentType(document.type),
    originalFileName: document.file,
    status: document.status,
    uploadedAt: document.on ? new Date(document.on).toISOString() : null,
  })),
  customDocumentTypes: customer.customDocs,
});

const loadCustomers = () => {
  if (customerApiLoaded) return Promise.resolve();
  if (!customerLoad) {
    customerApiLoading = true;
    customerApiError = "";
    customerLoad = api.get("/masters/customers", { params: { page: 1, limit: 100 } })
      .then(async (response) => {
        const records = response.data?.data?.items;
        if (!Array.isArray(records)) throw new Error("The server returned an invalid customer list.");
        const pages = Number(response.data?.data?.pagination?.pages) || 1;
        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
            api.get("/masters/customers", { params: { page: index + 2, limit: 100 } })
          )
        );
        const allRecords = [
          ...records,
          ...remaining.flatMap((pageResponse) => {
            const pageRecords = pageResponse.data?.data?.items;
            if (!Array.isArray(pageRecords)) throw new Error("The server returned an invalid customer list.");
            return pageRecords;
          }),
        ];
        state = {
          customers: allRecords.map((record: Record<string, unknown>, index: number) =>
            apiToCustomer(record, undefined, index)
          ),
        };
        customerApiLoaded = true;
      })
      .catch((error: { userMessage?: string; message?: string }) => {
        customerApiError = error.userMessage || error.message || "Could not load customer records.";
        throw error;
      })
      .finally(() => {
        customerApiLoading = false;
        subs.forEach((notify) => notify());
        customerLoad = null;
      });
  }
  return customerLoad;
};

const persistCustomer = async (customer: Customer) => {
  const response = customer.apiId
    ? await api.patch(`/masters/customers/${customer.apiId}`, customerToApi(customer))
    : await api.post("/masters/customers", customerToApi(customer));
  const saved = response.data?.data?.item as Record<string, unknown> | undefined;
  if (!saved) throw new Error("The server did not return the saved customer.");
  return apiToCustomer(saved, customer, 0);
};

const deleteCustomer = async (customer: Customer) => {
  if (!customer.apiId) throw new Error("Cannot delete a customer that is not saved on the server.");
  await api.delete(`/masters/customers/${customer.apiId}`);
};

export interface CustomerStoreStatus {
  loading: boolean;
  error: string;
}

export function useCustomers(): [
  CStore,
  (fn: (s: CStore) => CStore) => Promise<boolean>,
  CustomerStoreStatus,
] {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    void loadCustomers().catch(() => undefined);
    return () => { subs.delete(f); };
  }, []);

  const update = (fn: (s: CStore) => CStore): Promise<boolean> => {
    const mutation = customerMutationQueue.then(async () => {
      if (!customerApiLoaded) await loadCustomers();
      const previous = state;
      const next = fn(previous);
      const previousById = new Map(previous.customers.map((customer) => [customer.id, customer]));
      const nextById = new Map(next.customers.map((customer) => [customer.id, customer]));
      const savedCustomers: Customer[] = [];

      for (let index = 0; index < next.customers.length; index += 1) {
        const customer = next.customers[index];
        const oldCustomer = previousById.get(customer.id);
        savedCustomers.push(
          oldCustomer === customer
            ? customer
            : await persistCustomer(customer)
        );
      }

      for (const customer of previous.customers) {
        if (!nextById.has(customer.id)) await deleteCustomer(customer);
      }

      state = { ...next, customers: savedCustomers };
      customerApiError = "";
      subs.forEach((notify) => notify());
    });
    customerMutationQueue = mutation.then(() => undefined, () => undefined);

    return mutation.then(
      () => true,
      (error: { userMessage?: string; message?: string }) => {
        const message = error.userMessage || error.message || "Could not save customer record.";
        showError(message);
        return false;
      }
    );
  };
  return [state, update, { loading: customerApiLoading, error: customerApiError }];
}
