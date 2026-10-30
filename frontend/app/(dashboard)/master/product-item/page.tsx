"use client";

import { AlertTriangle, IndianRupee, Package } from "lucide-react";
import { MasterPage, inr, type MasterConfig } from "@/components/master/master-page";

const cfg: MasterConfig = {
  title: "Product / item master",
  subtitle: "Solar panels, inverters, batteries, cables and accessories with category and unit.",
  addLabel: "Add item", entity: "item",
  endpoint: "/masters/items",
  fromApi: (item) => ({
    id: String(item._id),
    name: String(item.itemName ?? ""),
    sku: String(item.sku ?? ""),
    hsn: String(item.hsnCode ?? ""),
    category: String((item.categoryId as { categoryName?: string } | null)?.categoryName ?? ""),
    unit: String(item.unit ?? ""),
    gst: `${Number(item.gstRate ?? 0)}%`,
    price: Number(item.unitPrice ?? 0),
    minStock: Number(item.minimumStock ?? 0),
    status: String(item.status ?? "Active"),
  }),
  toApi: (row) => ({
    itemName: row.name,
    sku: row.sku,
    hsnCode: row.hsn,
    categoryName: row.category,
    unit: row.unit,
    gstRate: Number(String(row.gst).replace("%", "")),
    unitPrice: Number(row.price),
    minimumStock: Number(row.minStock),
    status: row.status,
  }),
  searchPlaceholder: "Search by item, SKU or category",
  searchKeys: ["name", "sku", "category"],
  filterKey: "category", filterOptions: ["Solar panel", "Inverter", "Battery", "Cable", "Accessories"], filterAll: "All categories",
  stats: [
    { icon: <Package size={24} />, label: "Total items", value: (r) => r.length },
    { icon: <AlertTriangle size={24} />, label: "Inactive items", value: (r) => r.filter((x) => x.status === "Inactive").length },
    { icon: <IndianRupee size={24} />, label: "Avg. unit price", value: (r) => inr(Math.round(r.reduce((a, x) => a + Number(x.price), 0) / (r.length || 1))) },
  ],
  columns: [
    { key: "name", label: "Item", kind: "primary", sub: ["sku", "hsn"] },
    { key: "category", label: "Category", kind: "chip" },
    { key: "unit", label: "Unit" },
    { key: "gst", label: "GST" },
    { key: "price", label: "Unit price", kind: "money" },
    { key: "minStock", label: "Min stock" },
    { key: "status", label: "Status", kind: "status" },
  ],
  groups: [
    { label: "Basic", fields: [
      { key: "name", label: "Item name", span: true, required: true, placeholder: "540W Mono PERC panel" },
      { key: "sku", label: "SKU / code", required: true, placeholder: "PNL-540" },
      { key: "hsn", label: "HSN code", placeholder: "85414300" },
      { key: "category", label: "Category", type: "select", creatable: true, options: ["Solar panel", "Inverter", "Battery", "Cable", "Accessories"] },
      { key: "unit", label: "Unit", type: "select", creatable: true, options: ["Nos", "Meter", "Set", "Kg"] },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ] },
    { label: "Pricing & stock", fields: [
      { key: "price", label: "Unit price (₹)", type: "number" },
      { key: "gst", label: "GST", type: "select", options: ["5%", "12%", "18%"] },
      { key: "minStock", label: "Minimum stock", type: "number" },
    ] },
  ],
};

export default function ProductsPage() { return <MasterPage cfg={cfg} />; }