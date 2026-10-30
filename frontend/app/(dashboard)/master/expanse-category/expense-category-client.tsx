"use client";

import { IndianRupee, Receipt, UserCheck } from "lucide-react";
import { MasterPage, inr, type MasterConfig } from "@/components/master/master-page";

const cfg: MasterConfig = {
  title: "Expense category master",
  subtitle: "Travel, installation labour, transport and other expense categories.",
  addLabel: "Add category", entity: "category",
  endpoint: "/masters/expense-categories",
  fromApi: (item) => ({
    id: String(item._id),
    name: String(item.categoryName ?? ""),
    group: String(item.group ?? ""),
    budget: Number(item.monthlyBudget ?? 0),
    receipt: item.receiptRequired ? "Yes" : "No",
    status: String(item.status ?? "Active"),
    description: String(item.description ?? ""),
  }),
  toApi: (row) => ({
    categoryName: row.name,
    group: row.group,
    monthlyBudget: Number(row.budget),
    receiptRequired: row.receipt === "Yes",
    status: row.status,
    description: row.description,
  }),
  searchPlaceholder: "Search by category or group",
  searchKeys: ["name", "group"],
  filterKey: "status", filterOptions: ["Active", "Inactive"], filterAll: "All statuses",
  stats: [
    { icon: <Receipt size={24} />, label: "Total categories", value: (r) => r.length },
    { icon: <UserCheck size={24} />, label: "Active", value: (r) => r.filter((x) => x.status === "Active").length },
    { icon: <IndianRupee size={24} />, label: "Monthly budget", value: (r) => inr(r.reduce((a, x) => a + Number(x.budget), 0)) },
  ],
  columns: [
    { key: "name", label: "Category", kind: "primary", sub: ["description"] },
    { key: "group", label: "Group", kind: "chip" },
    { key: "budget", label: "Monthly budget", kind: "money" },
    { key: "receipt", label: "Receipt" },
    { key: "status", label: "Status", kind: "status" },
  ],
  groups: [{
    label: "Details",
    fields: [
      { key: "name", label: "Category name", span: true, required: true, placeholder: "Installation labour" },
      { key: "group", label: "Group", type: "select", creatable: true, options: ["Project", "Office", "Vehicle"] },
      { key: "budget", label: "Monthly budget (₹)", type: "number" },
      { key: "receipt", label: "Receipt required", type: "select", options: ["Yes", "No"] },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { key: "description", label: "Description", type: "textarea" },
    ],
  }],
};

export default function ExpenseCategoriesPage() { return <MasterPage cfg={cfg} />; }