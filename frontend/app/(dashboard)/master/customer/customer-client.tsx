"use client";

import {
  Avatar,
  Chip,
  KV,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  Tone,
  SelectField,
  TextField,
  ViewDialog,
  tabCls,
  tabsListCls,
} from "@/components/ui/page-layout";
import {
  SideSheet,
  darkBtn,
  fmtDate,
  outBtn,
  thCls,
} from "@/components/master/module-kit";
import {
  DISCOMS,
  ME,
  ROOFS,
  TYPES,
  blobs,
  docState,
  requiredDocs,
  useCustomers,
  withDoc,
  type Addr,
  type Customer,
  type DocRec,
} from "@/components/crm/customer-store";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  FileWarning,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldQuestion,
  Trash2,
  Upload,
  Users,
  X,
  MoreHorizontal,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DOC_FILTERS = [
  "Missing documents",
  "Re-upload needed",
  "Pending verification",
  "Verified",
];
const docTone: Record<string, Tone> = {
  "Missing documents": "red",
  "Re-upload needed": "red",
  "Pending verification": "amber",
  Verified: "green",
};
const dTone: Record<string, Tone> = {
  Verified: "green",
  Pending: "amber",
  Rejected: "red",
};
const STATES = [
  "Uttar Pradesh",
  "Delhi",
  "Haryana",
  "Rajasthan",
  "Uttarakhand",
  "Madhya Pradesh",
  "Other",
];
const digits = (s: string) => s.replace(/\D/g, "");
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
  PAN = /^[A-Z]{5}\d{4}[A-Z]$/;

const siteOf = (c: Customer): Addr => ({
  line: c.address,
  city: c.city,
  state: c.state,
  pincode: c.pincode,
});
const billOf = (c: Customer): Addr => (c.billingSame ? siteOf(c) : c.billing);
const addrDone = (a: Addr) =>
  !!(a.line.trim() && a.city.trim() && digits(a.pincode).length === 6);
const addrText = (a: Addr) =>
  [a.line, a.city, a.state, a.pincode].filter(Boolean).join(", ");
const addrOk = (c: Customer) => addrDone(siteOf(c)) && addrDone(billOf(c));

/* Shared document checklist */
function DocsPanel({
  c,
  onChange,
}: {
  c: Customer;
  onChange: (fn: (c: Customer) => Customer) => void;
}) {
  const [newDoc, setNewDoc] = useState("");
  const ds = docState(c),
    req = requiredDocs(c);
  const today = () => new Date().toISOString().slice(0, 10);

  const upload = (type: string, f: File) => {
    blobs.set(`${c.id}|${type}`, URL.createObjectURL(f));
    const rec: DocRec = {
      type,
      file: f.name,
      status: "Pending",
      on: today(),
      by: ME,
    };
    onChange((x) => withDoc(x, type, rec, `${type} uploaded`));
  };

  const decide = (rec: DocRec, status: DocRec["status"]) =>
    onChange((x) =>
      withDoc(
        x,
        rec.type,
        { ...rec, status, by: ME },
        `${rec.type} ${status.toLowerCase()}`,
      ),
    );

  const download = (rec: DocRec) => {
    const url = blobs.get(`${c.id}|${rec.type}`);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = rec.file;
    a.click();
  };

  const addDocType = () => {
    const name = newDoc.trim();
    if (
      !name ||
      requiredDocs(c).some((t) => t.toLowerCase() === name.toLowerCase())
    )
      return;
    onChange((x) => ({
      ...x,
      customDocs: [...x.customDocs, name],
      updatedOn: today(),
      updatedBy: ME,
      activity: [
        { title: `Document requested: ${name}`, meta: `Today · ${ME}` },
        ...x.activity,
      ],
    }));
    setNewDoc("");
  };

  const removeDocType = (type: string) =>
    onChange((x) => ({
      ...x,
      customDocs: x.customDocs.filter((t) => t !== type),
      docs: x.docs.filter((r) => r.type !== type),
      activity: [
        { title: `Document removed: ${type}`, meta: `Today · ${ME}` },
        ...x.activity,
      ],
    }));

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3">
          <StatusBadge tone={docTone[ds.status]}>{ds.status}</StatusBadge>
          <span className="text-sm font-medium text-slate-600">
            {ds.missing} document(s) pending
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          Required for {c.type}
        </span>
      </div>

      {/* Add Custom Doc */}
      <div className="flex gap-2">
        <Input
          value={newDoc}
          onChange={(e) => setNewDoc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDocType();
            }
          }}
          placeholder="Request custom document..."
          className="h-10 rounded-lg border-slate-200 bg-white"
        />
        <Button
          type="button"
          className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          disabled={!newDoc.trim()}
          onClick={addDocType}
        >
          <Plus size={16} className="mr-1.5" /> Add
        </Button>
      </div>

      {/* Document List */}
      <ul className="space-y-3">
        {req.map((t) => {
          const rec = c.docs.find((x) => x.type === t);
          const custom = c.customDocs.includes(t);
          const has = blobs.has(`${c.id}|${t}`);

          return (
            <li
              key={t}
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 rounded-full p-1.5 ${rec?.status === "Verified" ? "bg-green-50 text-green-600" : rec ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"}`}
                >
                  {rec?.status === "Verified" ? (
                    <CheckCircle2 size={18} />
                  ) : rec ? (
                    <FileText size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                    {t}
                    {custom && (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Custom
                      </span>
                    )}
                  </p>
                  {rec ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="truncate max-w-[150px]">{rec.file}</span>
                      <span className="text-slate-300">•</span>
                      <span>Uploaded {fmtDate(rec.on)}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400 font-medium">
                      Not uploaded yet
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {rec ? (
                  <StatusBadge tone={dTone[rec.status]}>
                    {rec.status}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="amber">Missing</StatusBadge>
                )}

                {rec && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-md border-slate-200 text-slate-500"
                    disabled={!has}
                    onClick={() => download(rec)}
                    title="Download"
                  >
                    <Download size={14} />
                  </Button>
                )}

                {rec?.status === "Pending" && (
                  <div className="flex gap-1.5 ml-1 border-l border-slate-200 pl-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                      onClick={() => decide(rec, "Verified")}
                    >
                      <Check size={14} className="mr-1" /> Verify
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md border-red-200 text-red-600 hover:bg-red-50 text-xs px-3"
                      onClick={() => decide(rec, "Rejected")}
                    >
                      <X size={14} className="mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {rec?.status !== "Pending" && (
                  <label className={`${buttonVariants({ size: "sm", variant: "outline" })} h-8 cursor-pointer rounded-md border-slate-200 px-3 text-xs`}>
                      <Upload size={14} className="mr-1.5" />{" "}
                      {rec ? "Replace" : "Upload"}
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(t, f);
                          e.target.value = "";
                        }}
                      />
                  </label>
                )}

                {custom && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => removeDocType(t)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CustomerMasterPage() {
  const [s, update, storeStatus] = useCustomers();
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [docF, setDocF] = useState("all");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const blank = (): Customer => ({
    id: Date.now(),
    code: (() => {
      let sequence = 1;
      const existing = new Set(s.customers.map((customer) => customer.code));
      while (existing.has(`CUS-${String(sequence).padStart(3, "0")}`)) sequence += 1;
      return `CUS-${String(sequence).padStart(3, "0")}`;
    })(),
    name: "",
    contact: "",
    phone: "",
    email: "",
    notes: "",
    type: "Residential",
    gstin: "",
    pan: "",
    address: "",
    city: "",
    state: "Uttar Pradesh",
    pincode: "",
    billingSame: true,
    billing: { line: "", city: "", state: "Uttar Pradesh", pincode: "" },
    customDocs: [],
    consumerNo: "",
    discom: "DVVNL",
    load: "",
    roof: "RCC",
    status: "Active",
    docs: [],
    createdOn: "",
    updatedOn: "",
    updatedBy: ME,
    owner: "Rohit Sharma",
    projects: [],
    quotes: [],
    payments: [],
    complaints: [],
    activity: [],
  });

  const [draft, setDraft] = useState<Customer>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const view = s.customers.find((c) => c.id === viewId);

  const rows = useMemo(
    () =>
      s.customers.filter(
        (c) =>
          (typeF === "all" || c.type === typeF) &&
          (docF === "all" || docState(c).status === docF) &&
          `${c.code} ${c.name} ${c.contact} ${c.phone} ${c.gstin} ${c.city}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [s.customers, q, typeF, docF],
  );
  const states = s.customers.map(docState);

  const set = (k: keyof Customer) => (v: string) =>
    setDraft((x) => ({
      ...x,
      [k]: k === "gstin" || k === "pan" ? v.toUpperCase() : v,
    }));
  const setBill = (k: keyof Addr) => (v: string) =>
    setDraft((x) => ({ ...x, billing: { ...x.billing, [k]: v } }));
  const openForm = (c: Customer) => {
    setDraft({ ...c, billing: { ...c.billing } });
    setFormOpen(true);
  };

  const isNew = !s.customers.some((x) => x.id === draft.id);
  const dup = s.customers.find(
    (c) =>
      c.id !== draft.id &&
      digits(c.phone) === digits(draft.phone) &&
      digits(draft.phone).length === 10,
  );
  const needGst = draft.type !== "Residential";
  const bill = draft.billingSame ? siteOf(draft) : draft.billing;

  const error = !draft.name.trim()
    ? "Customer / business name is required."
    : digits(draft.phone).length !== 10
      ? "Enter a 10-digit phone number."
      : dup
        ? `This phone already belongs to ${dup.name} (${dup.code}).`
        : needGst && !draft.gstin
          ? "GSTIN is required for commercial and industrial customers."
          : draft.gstin && !GSTIN.test(draft.gstin)
            ? "GSTIN format looks wrong."
            : draft.pan && !PAN.test(draft.pan)
              ? "PAN format looks wrong."
              : draft.pincode && digits(draft.pincode).length !== 6
                ? "Installation address: pincode must be 6 digits."
                : bill.pincode && digits(bill.pincode).length !== 6
                  ? "Billing address: pincode must be 6 digits."
                  : "";

  const save = async () => {
    if (error) return;
    const today = new Date().toISOString().slice(0, 10);
    setSaving(true);
    try {
      const saved = await update((st) =>
        isNew
          ? {
              ...st,
              customers: [
                {
                  ...draft,
                  createdOn: today,
                  updatedOn: today,
                  updatedBy: ME,
                  activity: [
                    { title: "Customer record created", meta: `Today · ${ME}` },
                    ...draft.activity,
                  ],
                },
                ...st.customers,
              ],
            }
          : {
              ...st,
              customers: st.customers.map((x) =>
                x.id === draft.id
                  ? {
                      ...draft,
                      updatedOn: today,
                      updatedBy: ME,
                      activity: [
                        { title: "Record updated", meta: `Today · ${ME}` },
                        ...draft.activity,
                      ],
                    }
                  : x,
              ),
            },
      );
      if (saved) setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const patch = (id: number, fn: (c: Customer) => Customer) =>
    update((st) => ({
      ...st,
      customers: st.customers.map((x) => (x.id === id ? fn(x) : x)),
    }));

  const removeCustomer = async (customer: Customer) => {
    if (!window.confirm(`Delete ${customer.name}? This action cannot be undone.`)) return;
    setDeleting(customer.id);
    try {
      const removed = await update((st) => ({
        ...st,
        customers: st.customers.filter((entry) => entry.id !== customer.id),
      }));
      if (removed) setViewId(null);
    } finally {
      setDeleting(null);
    }
  };

  const AddrBlock = ({ title, a }: { title: string; a: Addr }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
          <MapPin size={16} className="text-indigo-600" />
          {title}
        </p>
        <StatusBadge tone={addrDone(a) ? "green" : "amber"}>
          {addrDone(a) ? "Complete" : "Incomplete"}
        </StatusBadge>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        {addrText(a) || (
          <span className="text-slate-400 italic">No address added</span>
        )}
      </p>
    </div>
  );

  return (
    <div className="!space-y-2 text-[14px] font-sans">
      {storeStatus.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{storeStatus.error}</p>}
      <PageHeader
        title="Customer master"
        subtitle="Manage customer profiles, addresses, KYC documents, and solar connection details."
      >
        <Button
          size="lg"
          className={darkBtn}
          disabled={storeStatus.loading || saving}
          onClick={() => openForm(blank())}
        >
          <Plus className="mr-2 h-4 w-4" /> Add customer
        </Button>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={24} />}
          value={s.customers.length}
          label="Total customers"
        />
        <StatCard
          icon={<BadgeCheck size={24} />}
          value={states.filter((x) => x.status === "Verified").length}
          label="Fully verified"
        />
        <StatCard
          icon={<FileWarning size={24} />}
          value={states.filter((x) => x.missing > 0).length}
          label="Docs pending"
        />
        <StatCard
          icon={<ShieldQuestion size={24} />}
          value={
            states.filter((x) => x.status === "Pending verification").length
          }
          label="Needs review"
        />
      </div>

      {/* Main Table Area */}
      <Panel className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 bg-slate-50/50">
          <div className="relative min-w-[280px] flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID, phone or city..."
              className="h-10 rounded-lg border-slate-200 bg-white pl-10 focus-visible:ring-indigo-600"
            />
          </div>
          <Select value={typeF} onValueChange={setTypeF}>
            <SelectTrigger className="h-10 w-[160px] rounded-lg border-slate-200 bg-white text-slate-600">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={docF} onValueChange={setDocF}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border-slate-200 bg-white text-slate-600">
              <SelectValue placeholder="Doc Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Document states</SelectItem>
              {DOC_FILTERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b border-slate-200">
                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Location
                </TableHead>
                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Documents
                </TableHead>
                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Last Updated
                </TableHead>
                <TableHead className="h-12 px-5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const ds = docState(c);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50 group"
                    onClick={() => setViewId(c.id)}
                  >
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={c.name}
                          className="h-9 w-9 bg-slate-900 text-white font-semibold"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.code} • {c.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5">
                      <Chip className="bg-slate-100 text-slate-700 border-none font-medium">
                        {c.type}
                      </Chip>
                    </TableCell>
                    <TableCell className="px-5">
                      <p className="text-sm font-medium text-slate-800">
                        {c.city || "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {addrOk(c) ? "Address complete" : "Address missing"}
                      </p>
                    </TableCell>
                    <TableCell className="px-5">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge tone={docTone[ds.status]}>
                          {ds.status}
                        </StatusBadge>
                        <span className="text-[11px] font-medium text-slate-500">
                          {ds.have} of {ds.total} uploaded
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5">
                      <p className="text-sm text-slate-700">
                        {fmtDate(c.updatedOn)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        by {c.updatedBy}
                      </p>
                    </TableCell>
                    <TableCell className="px-5 text-right">
                      <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View details for ${c.name}`}
                        title="View details"
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewId(c.id);
                        }}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${c.name}`}
                        title="Edit customer"
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openForm(c);
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${c.name}`}
                        title="Delete customer"
                        className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        disabled={deleting === c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeCustomer(c);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Users size={32} className="text-slate-300 mb-3" />
                      <p className="font-medium text-slate-900">
                        {storeStatus.loading ? "Loading customers..." : "No customers found"}
                      </p>
                      <p className="text-sm mt-1">
                        {storeStatus.error || "Try adjusting your search or filters."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* ---------- Add / Edit (Side Sheet) ---------- */}
      <SideSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isNew ? "New customer record" : "Edit customer record"}
        description="Fill details and upload KYC documents."
        error={error}
        busy={saving}
        saveLabel="Save record"
        onSave={() => void save()}
      >
        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="flex w-full justify-start rounded-lg bg-slate-100 p-1 h-11 mb-6">
            <TabsTrigger
              value="details"
              className="flex-1 rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="address"
              className="flex-1 rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Address
            </TabsTrigger>
            <TabsTrigger
              value="site"
              className="flex-1 rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Site Data
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex-1 rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Docs ({docState(draft).have}/{docState(draft).total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Customer ID"
              value={draft.code}
              onChange={set("code")}
            />
            <SelectField
              label="Customer type"
              value={draft.type}
              onChange={set("type")}
              options={TYPES}
            />
            <TextField
              className="sm:col-span-2"
              label="Customer / business name"
              value={draft.name}
              onChange={set("name")}
              placeholder="e.g. Acme Corp"
            />
            <TextField
              label="Contact person"
              value={draft.contact}
              onChange={set("contact")}
            />
            <TextField
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={set("phone")}
            />
            <TextField
              label="Email"
              type="email"
              value={draft.email}
              onChange={set("email")}
            />
            <SelectField
              label="Status"
              value={draft.status}
              onChange={set("status")}
              options={["Active", "Inactive"]}
            />
            <TextField
              label={`GSTIN${needGst ? " (required)" : ""}`}
              value={draft.gstin}
              onChange={set("gstin")}
              placeholder="09AAACH1234A1Z5"
            />
            <TextField
              label="PAN"
              value={draft.pan}
              onChange={set("pan")}
              placeholder="ABCDE1234F"
            />
          </TabsContent>

          <TabsContent value="address" className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600" /> Installation
                Address
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  className="sm:col-span-2"
                  label="Address"
                  value={draft.address}
                  onChange={set("address")}
                  placeholder="House no, street, area"
                />
                <TextField
                  label="City"
                  value={draft.city}
                  onChange={set("city")}
                />
                <SelectField
                  label="State"
                  value={draft.state}
                  onChange={set("state")}
                  options={STATES}
                />
                <TextField
                  label="Pincode"
                  inputMode="numeric"
                  value={draft.pincode}
                  onChange={set("pincode")}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                checked={draft.billingSame}
                onChange={(e) =>
                  setDraft((x) => ({ ...x, billingSame: e.target.checked }))
                }
              />
              Billing address is same as installation address
            </label>

            {!draft.billingSame && (
              <div className="pt-2">
                <h4 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" /> Billing
                  Address{" "}
                  <span className="font-normal text-slate-500">
                    (For invoices)
                  </span>
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    className="sm:col-span-2"
                    label="Address"
                    value={draft.billing.line}
                    onChange={setBill("line")}
                  />
                  <TextField
                    label="City"
                    value={draft.billing.city}
                    onChange={setBill("city")}
                  />
                  <SelectField
                    label="State"
                    value={draft.billing.state}
                    onChange={setBill("state")}
                    options={STATES}
                  />
                  <TextField
                    label="Pincode"
                    inputMode="numeric"
                    value={draft.billing.pincode}
                    onChange={setBill("pincode")}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="site" className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Electricity consumer number"
              value={draft.consumerNo}
              onChange={set("consumerNo")}
            />
            <SelectField
              label="DISCOM"
              value={draft.discom}
              onChange={set("discom")}
              options={DISCOMS}
            />
            <TextField
              label="Sanctioned load (kW)"
              type="number"
              min={0}
              value={draft.load}
              onChange={set("load")}
            />
            <SelectField
              label="Roof type"
              value={draft.roof}
              onChange={set("roof")}
              options={ROOFS}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocsPanel c={draft} onChange={(fn) => setDraft(fn)} />
          </TabsContent>
        </Tabs>
      </SideSheet>
{/* ---------- View Details Dialog (Centered Modal) ---------- */}

{view &&
  (() => {
    const ds = docState(view);
    return (
      <ViewDialog
        open
        onOpenChange={() => setViewId(null)}
        size="sm:max-w-3xl"
        title=""
        description=""
        footer={
          <div className="flex w-full items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
            <div className="text-[11px] text-slate-400">
              Updated by <span className="font-medium text-slate-600">{view.updatedBy}</span> • {fmtDate(view.updatedOn)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 rounded-md border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setViewId(null)}
              >
                Close
              </Button>
              <Button
                className="h-8 rounded-xl bg-slate-950 px-3.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-slate-800"
                onClick={() => {
                  setViewId(null);
                  openForm(view);
                }}
              >
                <Pencil size={13} className="mr-1.5" /> Edit Record
              </Button>
            </div>
          </div>
        }
      >
        {/* Custom Header Section */}
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar
              name={view.name}
              className="h-11 w-11 bg-indigo-50 text-indigo-600 text-base font-semibold rounded-lg border border-indigo-100/80"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-none">
                  {view.name}
                </h2>
                <span className="font-mono text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                  {view.code}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-medium text-slate-600">{view.type} Customer</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600">{view.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge tone={docTone[ds.status]}>
              {ds.status}
            </StatusBadge>
            <span className="text-[11px] font-medium text-slate-400">
              {ds.have}/{ds.total} docs uploaded
            </span>
          </div>
        </div>

        {/* Compact Navigation Tabs */}
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-lg bg-slate-100/80 p-0.5 h-8 mb-3 text-slate-600">
            <TabsTrigger
              value="record"
              className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              Documents ({ds.have}/{ds.total})
            </TabsTrigger>
            <TabsTrigger
              value="address"
              className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              Addresses
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="record" className="mt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Contact Person</p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{view.contact || "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Phone Number</p>
                <a href={`tel:${view.phone}`} className="text-xs font-semibold text-indigo-600 hover:underline mt-0.5 block">
                  {view.phone}
                </a>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Email Address</p>
                <p className="text-xs font-medium text-slate-800 truncate mt-0.5">{view.email || "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">GSTIN</p>
                <p className="text-xs font-mono font-medium text-slate-800 mt-0.5">{view.gstin || "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">PAN Number</p>
                <p className="text-xs font-mono font-medium text-slate-800 mt-0.5">{view.pan || "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Consumer No.</p>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{view.consumerNo || "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">DISCOM</p>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{view.discom}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Sanctioned Load</p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{view.load ? `${view.load} kW` : "—"}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Roof Type</p>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{view.roof}</p>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">Customer Since</p>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{fmtDate(view.createdOn)}</p>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="docs" className="mt-0">
            <DocsPanel c={view} onChange={(fn) => patch(view.id, fn)} />
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="address" className="mt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <AddrBlock title="Installation Address" a={siteOf(view)} />
              <AddrBlock
                title={
                  view.billingSame
                    ? "Billing Address (Same as site)"
                    : "Billing Address"
                }
                a={billOf(view)}
              />
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="history" className="mt-0">
            <div className="rounded-lg border border-slate-200/80 bg-white p-3.5">
              <ol className="ml-2 border-l border-slate-200 space-y-3">
                {view.activity.map((h, i) => (
                  <li key={i} className="relative pl-4">
                    <span className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                    <p className="font-medium text-slate-800 text-xs">
                      {h.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {h.meta}
                    </p>
                  </li>
                ))}
                {view.activity.length === 0 && (
                  <li className="pl-4 text-xs text-slate-400 italic">
                    No activity history found.
                  </li>
                )}
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </ViewDialog>
    );
  })()}
    </div>
  );
}
