"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";
import {
  Plus,
  Download,
  Search,
  Receipt,
  Clock3,
  CircleCheck,
  Wallet,
  X,
  Paperclip,
  Check,
  Tag,
  FolderKanban,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/ui/page-layout";

/* ---------- Types ---------- */

type Status = "pending" | "approved" | "paid" | "rejected";
type Mode = "Cash" | "UPI" | "Bank transfer" | "Cheque";

type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  categoryId: string;
  paidTo: string;
  mode: Mode;
  project: string; // "" = general / office
  projectId: string;
  amount: number;
  status: Status;
  addedBy: string;
  hasReceipt: boolean;
};

type CategoryOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };
const categoryColors = [
  ["bg-indigo-600", "bg-indigo-600"], ["bg-indigo-400", "bg-indigo-400"],
  ["bg-amber-500", "bg-amber-500"], ["bg-emerald-500", "bg-emerald-500"],
  ["bg-sky-500", "bg-sky-500"], ["bg-slate-500", "bg-slate-500"],
  ["bg-rose-400", "bg-rose-400"],
];

const modes: Mode[] = ["Cash", "UPI", "Bank transfer", "Cheque"];

const fromApi = (record: Record<string, unknown>): Expense => {
  const category = record.category && typeof record.category === "object" ? record.category as Record<string, unknown> : null;
  const project = record.project && typeof record.project === "object" ? record.project as Record<string, unknown> : null;
  const createdBy = record.createdBy && typeof record.createdBy === "object" ? record.createdBy as Record<string, unknown> : null;
  const receipt = record.receipt && typeof record.receipt === "object" ? record.receipt as Record<string, unknown> : null;
  return {
    id: String(record._id ?? ""), date: String(record.expenseDate ?? "").slice(0, 10),
    title: String(record.title ?? ""), category: String(category?.categoryName ?? ""),
    categoryId: String(category?._id ?? record.category ?? ""), paidTo: String(record.paidTo ?? ""),
    mode: String(record.paymentMode ?? "Cash") as Mode,
    project: project ? `${String(project.projectCode ?? "")} · ${Number(project.systemSizeKw ?? 0)} kW` : "",
    projectId: String(project?._id ?? record.project ?? ""), amount: Number(record.amount ?? 0),
    status: String(record.status ?? "pending") as Status, addedBy: String(createdBy?.name ?? ""),
    hasReceipt: Boolean(receipt?.url),
  };
};

/* ---------- Helpers ---------- */

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const statusStyle: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

const statusLabel: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Page ---------- */

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tab, setTab] = useState<"all" | Status>("all");
  const [open, setOpen] = useState(false);
  const categories = categoryOptions.map((option, index) => ({
    ...option,
    ...{ bar: categoryColors[index % categoryColors.length][0], dot: categoryColors[index % categoryColors.length][1] },
  }));
  const load = useCallback(async () => {
    const [records, optionsResponse] = await Promise.all([
      getAllPages<Record<string, unknown>>("/expenses"),
      api.get("/expenses/options"),
    ]);
    setExpenses(records.map(fromApi));
    const options = optionsResponse.data?.data;
    setCategoryOptions((options?.categories ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.categoryName) })));
    setProjectOptions((options?.projects ?? []).map((item: Record<string, unknown>) => ({
      id: String(item._id), name: `${String(item.projectCode)} · ${Number(item.systemSizeKw ?? 0)} kW`,
    })));
    setRequestError("");
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load expenses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const counted = expenses.filter((e) => e.status !== "rejected");
  const total = counted.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => e.status === "pending");
  const pendingSum = pending.reduce((s, e) => s + e.amount, 0);
  const paidSum = expenses.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          total: counted.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0),
        }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total),
    [expenses] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const maxCat = byCategory[0]?.total || 1;

  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    counted.forEach((e) => {
      if (!e.project) return;
      map.set(e.project, (map.get(e.project) || 0) + e.amount);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxProj = byProject[0]?.[1] || 1;

  const visible = expenses.filter((e) => {
    if (tab !== "all" && e.status !== tab) return false;
    if (category !== "all" && e.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.paidTo, e.project, e.id].some((v) => v.toLowerCase().includes(q));
  });

  const setStatus = async (id: string, status: Status) => {
    try {
      const response = await api.patch(`/expenses/${id}/status`, { status });
      const updated = fromApi(response.data?.data?.item);
      setExpenses((list) => list.map((expense) => expense.id === id ? updated : expense));
      setRequestError("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update expense status.");
    }
  };

  const tabs: { key: "all" | Status; label: string; count: number }[] = [
    { key: "all", label: "All", count: expenses.length },
    { key: "pending", label: "Pending", count: expenses.filter((e) => e.status === "pending").length },
    { key: "approved", label: "Approved", count: expenses.filter((e) => e.status === "approved").length },
    { key: "paid", label: "Paid", count: expenses.filter((e) => e.status === "paid").length },
  ];

  return (
    <div className="!space-y-2">
      <PageHeader title="Expenses" subtitle="Track every rupee spent on projects, team and office, and approve bills.">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Download size={16} /> Export
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            <Plus size={16} /> Add expense
          </button>
      </PageHeader>
      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-4 text-sm text-slate-500">Loading expenses...</Panel>}

      {/* Summary cards */}
      <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Wallet size={24} />} value={inr(total)} label="Total expenses" />
        <StatCard icon={<Clock3 size={24} />} value={inr(pendingSum)} label={`Awaiting approval · ${pending.length} bills`} />
        <StatCard icon={<CircleCheck size={24} />} value={inr(paidSum)} label="Paid out" />
        <StatCard icon={<Tag size={24} />} value={byCategory[0]?.name ?? "-"} label="Top category" />
      </section>

      {/* Breakdown */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Spend by category</h2>
          <p className="mt-0.5 text-sm text-slate-500">Where the money went across recorded expenses</p>
          <div className="mt-5 space-y-4">
            {byCategory.map((c) => (
              <div key={c.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                    {c.name}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {inr(c.total)}
                    <span className="ml-1.5 text-xs text-slate-400">{Math.round((c.total / total) * 100)}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${c.bar}`} style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Spend by project</h2>
          <p className="mt-0.5 text-sm text-slate-500">Expenses linked to solar projects</p>
          <div className="mt-5 space-y-4">
            {byProject.map(([name, amt]) => (
              <div key={name}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                    <FolderKanban size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{inr(amt)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${(amt / maxProj) * 100}%` }} />
                </div>
              </div>
            ))}
            {byProject.length === 0 && <p className="text-sm text-slate-500">No project expenses yet.</p>}
          </div>
        </Panel>
      </section>

      {/* Table */}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  tab === t.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
                <span className={`text-xs tabular-nums ${tab === t.key ? "text-slate-400" : "text-slate-400"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, vendor, project..."
                className={`${inputCls} pl-10 sm:w-64`}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} sm:w-48`}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 sm:px-6">Expense</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Paid via</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((e) => {
                const cat = categories.find((c) => c.name === e.category);
                return (
                  <tr key={e.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Receipt size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{e.title}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            {e.paidTo} · {fmtDate(e.date)}
                            {e.hasReceipt && <Paperclip size={12} className="text-slate-400" aria-label="Receipt attached" />}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${cat?.dot ?? "bg-slate-400"}`} />
                        {e.category}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-4 text-slate-600">{e.project || "General"}</td>
                    <td className="px-3 py-4 text-slate-600">{e.mode}</td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900">{inr(e.amount)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle[e.status]}`}>
                        {statusLabel[e.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      {e.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStatus(e.id, "approved")}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus(e.id, "rejected")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : e.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => setStatus(e.id, "paid")}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Mark paid
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">{e.addedBy}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Receipt size={22} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">No expenses found</p>
              <p className="mt-1 text-sm text-slate-500">Change the filters or add a new expense.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400 sm:px-6">
          <span>Showing {visible.length} of {expenses.length} expenses</span>
          <span>{loading ? "Loading…" : "Live records"}</span>
        </div>
      </Panel>

      {open && (
        <AddExpenseDialog
          onClose={() => setOpen(false)}
          categories={categoryOptions}
          projects={projectOptions}
          onSave={async (payload) => {
            const response = await api.post("/expenses", payload);
            setExpenses((list) => [fromApi(response.data?.data?.item), ...list]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Add expense dialog ---------- */

function AddExpenseDialog({
  onClose,
  onSave,
  categories,
  projects,
}: {
  onClose: () => void;
  categories: CategoryOption[];
  projects: ProjectOption[];
  onSave: (payload: { title: string; amount: number; expenseDate: string; categoryId: string; paidTo: string; paymentMode: Mode; projectId: string | null; receipt: { url: string; publicId: string; name: string } }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    category: categories[0]?.id ?? "",
    paidTo: "",
    mode: "UPI" as Mode,
    project: "",
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const selectedCategory = form.category || categories[0]?.id || "";
  const valid = form.title.trim() && Number(form.amount) > 0 && Boolean(selectedCategory);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      let uploadedReceipt = { url: "", publicId: "", name: "" };
      if (receipt) {
        const formData = new FormData();
        formData.append("receipt", receipt);
        const response = await api.post("/expenses/receipts", formData);
        uploadedReceipt = response.data?.data;
      }
      await onSave({
        title: form.title.trim(), amount: Number(form.amount), expenseDate: form.date,
        categoryId: selectedCategory, paidTo: form.paidTo.trim(), paymentMode: form.mode,
        projectId: form.project || null, receipt: uploadedReceipt,
      });
    } catch (reason) {
      const err = reason as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || "Could not save expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Add expense">
      <form
        onSubmit={submit}
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add expense</h2>
            <p className="mt-0.5 text-sm text-slate-500">It will go to Admin for approval.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
          {error && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="sm:col-span-2">
            <Field label="What was it for?">
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Inverter 10 kW" className={inputCls} autoFocus />
            </Field>
          </div>
          <Field label="Amount (₹)">
            <input type="number" min="0" inputMode="numeric" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Category">
            <select value={selectedCategory} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Paid to">
            <input value={form.paidTo} onChange={(e) => set("paidTo", e.target.value)} placeholder="Vendor or employee" className={inputCls} />
          </Field>
          <Field label="Payment mode">
            <select value={form.mode} onChange={(e) => set("mode", e.target.value)} className={inputCls}>
              {modes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Linked project (optional)">
            <select value={form.project} onChange={(e) => set("project", e.target.value)} className={inputCls}>
              <option value="">General / office</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Bill or receipt</span>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3.5 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/40">
              <Paperclip size={17} className="text-slate-400" />
              <span className="truncate">{receipt?.name || "Upload a photo or PDF"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || saving}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
