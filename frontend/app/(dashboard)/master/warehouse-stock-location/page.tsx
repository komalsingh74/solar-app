"use client";

import { MapPin, UserCheck, Warehouse } from "lucide-react";
import { MasterPage, type MasterConfig } from "@/components/master/master-page";

const cfg: MasterConfig = {
  title: "Warehouse Master",
  subtitle: "Create and maintain warehouses, office stores and site stock locations.",
  addLabel: "Add warehouse", entity: "warehouse",
  endpoint: "/masters/warehouses",
  fromApi: (item) => ({
    id: String(item._id),
    name: String(item.locationName ?? ""),
    type: String(item.type ?? "Main warehouse"),
    rack: String(item.rackZone ?? ""),
    incharge: String(item.inCharge ?? ""),
    address: String(item.address ?? ""),
    city: String(item.city ?? ""),
    status: String(item.status ?? "Active"),
  }),
  toApi: (row) => ({
    locationName: row.name,
    type: row.type,
    rackZone: row.rack,
    inCharge: row.incharge,
    address: row.address,
    city: row.city,
    status: row.status,
  }),
  searchPlaceholder: "Search by location, city or in-charge",
  searchKeys: ["name", "city", "incharge"],
  filterKey: "type", filterOptions: ["Main warehouse", "Office stock", "Site stock"], filterAll: "All types",
  stats: [
    { icon: <Warehouse size={24} />, label: "Total locations", value: (r) => r.length },
    { icon: <UserCheck size={24} />, label: "Active locations", value: (r) => r.filter((x) => x.status === "Active").length },
    { icon: <MapPin size={24} />, label: "Cities", value: (r) => new Set(r.map((x) => x.city)).size },
  ],
  columns: [
    { key: "name", label: "Location", kind: "primary", sub: ["address"] },
    { key: "type", label: "Type", kind: "chip" },
    { key: "rack", label: "Rack / zone" },
    { key: "city", label: "City" },
    { key: "incharge", label: "In-charge" },
    { key: "status", label: "Status", kind: "status" },
  ],
  groups: [{
    label: "Details",
    fields: [
      { key: "name", label: "Location name", span: true, required: true, placeholder: "Agra main warehouse" },
      { key: "type", label: "Type", type: "select", options: ["Main warehouse", "Office stock", "Site stock"] },
      { key: "rack", label: "Rack / zone (optional)" },
      { key: "incharge", label: "In-charge" },
      { key: "address", label: "Address", span: true },
      { key: "city", label: "City" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
  }],
};

export default function WarehousesPage() { return <MasterPage cfg={cfg} />; }
