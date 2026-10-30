"use client";

import { Megaphone, TrendingUp, Zap } from "lucide-react";
import { MasterPage, type MasterConfig } from "@/components/master/master-page";

const cfg: MasterConfig = {
  title: "Lead source master",
  subtitle: "Website, referral, WhatsApp and call leads in one list.",
  addLabel: "Add source", entity: "source",
  endpoint: "/masters/lead-sources",
  fromApi: (item) => ({
    id: String(item._id),
    name: String(item.sourceName ?? ""),
    description: String(item.description ?? ""),
    channel: String(item.channel ?? ""),
    leads: Number(item.leadCount ?? 0),
    converted: Number(item.convertedCount ?? 0),
    status: String(item.status ?? "Active"),
  }),
  toApi: (row) => ({
    sourceName: row.name,
    channel: row.channel,
    status: row.status,
    description: row.description,
  }),
  searchPlaceholder: "Search by source or channel",
  searchKeys: ["name", "channel"],
  filterKey: "status", filterOptions: ["Active", "Inactive"], filterAll: "All statuses",
  stats: [
    { icon: <Megaphone size={24} />, label: "Total sources", value: (r) => r.length },
    { icon: <Zap size={24} />, label: "Active sources", value: (r) => r.filter((x) => x.status === "Active").length },
    { icon: <TrendingUp size={24} />, label: "Total leads", value: (r) => r.reduce((a, x) => a + Number(x.leads), 0) },
  ],
  columns: [
    { key: "name", label: "Source", kind: "primary", sub: ["description"] },
    { key: "channel", label: "Channel", kind: "chip" },
    { key: "leads", label: "Leads" },
    { key: "converted", label: "Converted" },
    { key: "status", label: "Status", kind: "status" },
  ],
  groups: [{
    label: "Details",
    fields: [
      { key: "name", label: "Source name", span: true, required: true, placeholder: "Website" },
      { key: "channel", label: "Channel", type: "select", options: ["Online", "Offline", "Referral"] },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { key: "description", label: "Description", type: "textarea", placeholder: "Where do these leads come from?" },
    ],
  }],
};

export default function LeadSourcesPage() { return <MasterPage cfg={cfg} />; }