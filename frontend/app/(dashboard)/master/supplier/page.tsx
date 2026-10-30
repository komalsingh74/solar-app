"use client";

import { MapPin, Truck, UserCheck } from "lucide-react";
import { MasterPage, type MasterConfig } from "@/components/master/master-page";

const cfg: MasterConfig = {
  title: "Supplier / vendor master",
  subtitle: "Supplier details, GSTIN and payment terms for purchase records.",
  addLabel: "Add supplier", entity: "supplier",
  endpoint: "/masters/suppliers",
  fromApi: (item) => ({
    id: String(item._id),
    name: String(item.supplierName ?? ""),
    contact: String(item.contactPerson ?? ""),
    phone: String(item.phone ?? ""),
    email: String(item.email ?? ""),
    gstin: String(item.gstin ?? ""),
    supplies: Array.isArray(item.supplies) ? item.supplies.join(", ") : "",
    address: String(item.address ?? ""),
    city: String(item.city ?? ""),
    terms: String(item.paymentTerms ?? "Advance").replace(/^(\d+) Days$/, "Net $1"),
    status: String(item.status ?? "Active"),
  }),
  toApi: (row) => ({
    supplierName: row.name,
    contactPerson: row.contact,
    phone: row.phone,
    email: row.email,
    gstin: row.gstin,
    supplies: String(row.supplies).split(",").map((value) => value.trim()).filter(Boolean),
    address: row.address,
    city: row.city,
    paymentTerms: row.terms,
    status: row.status,
  }),
  searchPlaceholder: "Search by supplier, item or city",
  searchKeys: ["name", "contact", "city", "supplies"],
  filterKey: "status", filterOptions: ["Active", "Inactive"], filterAll: "All statuses",
  stats: [
    { icon: <Truck size={24} />, label: "Total suppliers", value: (r) => r.length },
    { icon: <UserCheck size={24} />, label: "Active suppliers", value: (r) => r.filter((x) => x.status === "Active").length },
    { icon: <MapPin size={24} />, label: "Cities covered", value: (r) => new Set(r.map((x) => x.city)).size },
  ],
  columns: [
    { key: "name", label: "Supplier", kind: "primary", sub: ["contact", "phone"] },
    { key: "supplies", label: "Supplies", kind: "chips" },
    { key: "city", label: "City" },
    { key: "terms", label: "Terms" },
    { key: "gstin", label: "GSTIN" },
    { key: "status", label: "Status", kind: "status" },
  ],
  groups: [
    { label: "Supplier", fields: [
      { key: "name", label: "Supplier name", span: true, required: true, placeholder: "Sunrise Solar Traders" },
      { key: "contact", label: "Contact person" },
      { key: "phone", label: "Phone", type: "tel", required: true },
      { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
      { key: "gstin", label: "GSTIN" },
      { key: "supplies", label: "Supplies (comma separated)", span: true, placeholder: "Panels, Inverters" },
    ] },
    { label: "Address & terms", fields: [
      { key: "address", label: "Address", span: true },
      { key: "city", label: "City" },
      { key: "terms", label: "Payment terms", type: "select", options: ["Advance", "Net 15", "Net 30", "Net 45"] },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ] },
  ],
};

export default function SuppliersPage() { return <MasterPage cfg={cfg} />; }