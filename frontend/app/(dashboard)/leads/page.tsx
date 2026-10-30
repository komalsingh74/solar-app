"use client";

import { AreaField, KV, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, Building2, CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, Home, MapPin, MessageCircle, MoreVertical, Pencil, Phone, Plus, Sun, User, Users, Eye, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "@/lib/api";

/* ───────────────────────── data ───────────────────────── */

const STAGES = ["Lead", "Follow-up", "Site Visit", "Site Survey", "Quotation", "Converted", "Lost"];
const TYPES = ["Residential", "Commercial" ,"Industrial", "Government"];
const LOST_REASONS = ["Price too high", "Chose competitor", "No roof space", "Not interested now", "Loan rejected"];
const CLOSED = ["Converted", "Lost"];
const PAGE_SIZE = 10;

const stageCls: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-600",
  "Follow-up": "bg-violet-100 text-violet-700",
  "Site Visit": "bg-sky-100 text-sky-700",
  "Site Survey": "bg-emerald-100 text-emerald-700",
  Quotation: "bg-orange-100 text-orange-600",
  Converted: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-600",
};
type Lead = {
  id: string; name: string; type: string; phone: string; location: string; stage: string; source: string; sourceId: string;
  employee: string; employeeId: string; followUp: string; followUpType: string; priority: string; reminder: boolean; followUpNotes: string;
  kw: string; amount: string; installDate: string; lostReason: string; requirement: string; monthlyBill: string; roofType: string; budget: string; notes: string;
};

const blank: Lead = {
  id: "", name: "", type: "Residential", phone: "", location: "", stage: "Lead", source: "", sourceId: "", employee: "", employeeId: "",
  followUp: "", followUpType: "Call", priority: "Medium", reminder: false, followUpNotes: "",
  kw: "", amount: "", installDate: "", lostReason: "", requirement: "", monthlyBill: "", roofType: "", budget: "", notes: "",
};

const PIPE_TABS = [
  { key: "all", label: "Total", dot: "bg-indigo-500" },
  { key: "Lead", label: "Lead", dot: "bg-sky-500" },
  { key: "Follow-up", label: "Follow-up", dot: "bg-violet-500" },
  { key: "Site Visit", label: "Site Visit", dot: "bg-sky-500" },
  { key: "Quotation", label: "Quotation", dot: "bg-orange-400" },
  { key: "Won", label: "Won", dot: "bg-emerald-500" },
];
const pipeCls: Record<string, { badge: string; bar: string }> = {
  Lead: { badge: "bg-slate-100 text-slate-600", bar: "bg-slate-400" },
  "Follow-up": { badge: "bg-violet-50 text-violet-600", bar: "bg-violet-500" },
  "Site Visit": { badge: "bg-sky-50 text-sky-600", bar: "bg-sky-500" },
  "Site Survey": { badge: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  Quotation: { badge: "bg-orange-50 text-orange-500", bar: "bg-orange-400" },
  Negotiation: { badge: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  Won: { badge: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  Lost: { badge: "bg-red-50 text-red-600", bar: "bg-red-500" },
};

type Option = { id: string; name: string };
const apiToLead = (record: Record<string, unknown>): Lead => {
  const source = record.source && typeof record.source === "object" ? record.source as Record<string, unknown> : null;
  const employee = record.assignedEmployee && typeof record.assignedEmployee === "object" ? record.assignedEmployee as Record<string, unknown> : null;
  const next = record.nextFollowUp && typeof record.nextFollowUp === "object" ? record.nextFollowUp as Record<string, unknown> : {};
  return {
    ...blank,
    id: String(record._id ?? ""),
    name: String(record.name ?? ""),
    type: String(record.customerType ?? "Residential"),
    phone: String(record.phone ?? ""),
    location: String(record.location ?? ""),
    stage: record.stage === "Won" ? "Converted" : String(record.stage ?? "Lead"),
    source: String(source?.sourceName ?? ""),
    sourceId: String(source?._id ?? record.source ?? ""),
    employee: String(employee?.name ?? ""),
    employeeId: String(employee?._id ?? record.assignedEmployee ?? ""),
    followUp: next.date ? localDateTime(next.date) : "",
    followUpType: String(next.type ?? "Call"),
    priority: String(next.priority ?? "Medium"),
    reminder: Boolean(next.reminder),
    followUpNotes: String(next.notes ?? ""),
    kw: record.systemSizeKw == null ? "" : String(record.systemSizeKw),
    amount: record.quotationAmount == null ? "" : String(record.quotationAmount),
    installDate: "",
    lostReason: String(record.lostReason ?? ""),
    requirement: String(record.customerRequirement ?? ""),
    monthlyBill: record.monthlyElectricityBill == null ? "" : String(record.monthlyElectricityBill),
    roofType: String(record.roofType ?? ""),
    budget: record.budget == null ? String(record.financingRequirement ?? "") : String(record.budget),
    notes: String(record.additionalNotes ?? ""),
  };
};

const leadToApi = (lead: Lead) => ({
  name: lead.name,
  phone: lead.phone,
  customerType: lead.type,
  location: lead.location,
  stage: lead.stage === "Converted" ? "Won" : lead.stage,
  sourceId: lead.sourceId || null,
  assignedEmployeeId: lead.employeeId || null,
  nextFollowUp: {
    date: lead.followUp || null,
    type: lead.followUpType,
    priority: lead.priority,
    reminder: lead.reminder,
    notes: lead.followUpNotes,
  },
  systemSizeKw: lead.kw ? Number(lead.kw) : null,
  quotationAmount: lead.amount ? Number(lead.amount) : null,
  lostReason: lead.lostReason,
  customerRequirement: lead.requirement,
  monthlyElectricityBill: lead.monthlyBill ? Number(lead.monthlyBill) : null,
  roofType: lead.roofType,
  budget: lead.budget && !Number.isNaN(Number(lead.budget)) ? Number(lead.budget) : null,
  financingRequirement: lead.budget && Number.isNaN(Number(lead.budget)) ? lead.budget : "",
  additionalNotes: lead.notes,
});

/* ───────────────────────── helpers ───────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : "—");
const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const localISO = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const localDateTime = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return `${localISO(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const daysBetween = (iso: string, today: string) => Math.round((Date.parse(`${iso}T00:00`) - Date.parse(`${today}T00:00`)) / 864e5);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "L";
// PM Surya Ghar style estimate: ₹30k/kW for first 2 kW, ₹18k for 3rd kW, capped at ₹78k. Residential only.
const subsidy = (l: Lead) => (l.type !== "Residential" ? 0 : Math.min(78000, Math.min(+l.kw || 0, 2) * 30000 + ((+l.kw || 0) >= 3 ? 18000 : 0)));

/* ───────────────────────── small pieces ───────────────────────── */

const Badge = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
);

function Kpi({ icon, tint, value, label }: { icon: ReactNode; tint: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tint}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function RowMenu({ lead, onView, onEdit, onDelete }: { lead: Lead; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const item = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50";
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button aria-label={`Actions for ${lead.name}`} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 text-[13px] shadow-lg">
            <button className={item} onClick={() => { setOpen(false); onView(); }}><Eye size={14} /> View details</button>
            <button className={item} onClick={() => { setOpen(false); onEdit(); }}><Pencil size={14} /> Edit lead</button>
            <button className={`${item} text-red-600`} onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={14} /> Delete lead</button>
            <a className={item} href={`tel:${lead.phone.replace(/\s/g, "")}`}><Phone size={14} /> Call</a>
            <a className={item} target="_blank" rel="noreferrer" href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`}><MessageCircle size={14} /> WhatsApp</a>
          </div>
        </>
      )}
    </div>
  );
}

function SolarHouse() {
  return (
    <svg viewBox="0 0 160 104" className="h-full w-full" role="img" aria-label="Rooftop solar installation">
      <rect width="160" height="104" fill="#cfe3f5" />
      <rect y="80" width="160" height="24" fill="#8fb872" />
      <rect x="22" y="50" width="116" height="34" fill="#f2ede5" />
      <polygon points="8,54 36,18 152,18 152,54" fill="#5a6270" />
      <g fill="#1e3a8a" stroke="#93c5fd" strokeWidth=".6">
        {[40, 62, 84, 106, 128].map((x) => <rect key={`a${x}`} x={x} y="21" width="20" height="12" />)}
        {[30, 52, 74, 96, 118].map((x) => <rect key={`b${x}`} x={x} y="36" width="20" height="12" />)}
      </g>
      <g fill="#8aa7c4"><rect x="34" y="60" width="18" height="14" /><rect x="64" y="60" width="18" height="14" /><rect x="112" y="60" width="18" height="14" /></g>
      <rect x="92" y="60" width="12" height="24" fill="#7a5c43" />
    </svg>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<Option[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localISO(new Date())), []);

  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [emp, setEmp] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState("");

  const [draft, setDraft] = useState<Lead>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const [pipeTab, setPipeTab] = useState("all");
  const [pipeAll, setPipeAll] = useState(false);

  const loadLeads = async () => {
    const [first, options] = await Promise.all([
      api.get("/leads", { params: { page: 1, limit: 100 } }),
      api.get("/leads/options"),
    ]);
    const records = first.data?.data?.items;
    if (!Array.isArray(records)) throw new Error("The server returned an invalid lead list.");
    const pages = Number(first.data?.data?.pagination?.pages) || 1;
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      api.get("/leads", { params: { page: index + 2, limit: 100 } })
    ));
    const allRecords = [...records, ...rest.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid lead list.");
      return items;
    })];
    setLeads(allRecords.map((record: Record<string, unknown>) => apiToLead(record)));
    setSources((options.data?.data?.sources ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.sourceName) })));
    setStaff((options.data?.data?.employees ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.name) })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    loadLeads()
      .catch((error: { userMessage?: string; message?: string }) => {
        if (active) setRequestError(error.userMessage || error.message || "Could not load leads.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filter = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };
  const rows = useMemo(
    () => leads.filter((l) =>
      (stage === "all" || l.stage === stage) && (source === "all" || l.source === source) && (emp === "all" || l.employee === emp) &&
      (!l.followUp || ((!from || l.followUp.slice(0, 10) >= from) && (!to || l.followUp.slice(0, 10) <= to)))),
    [leads, stage, source, emp, from, to],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const pageRows = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const startPage = Math.max(1, Math.min(cur - 2, pages - 4));
  const pageNums = Array.from({ length: Math.min(5, pages) }, (_, i) => startPage + i);
  const sel = leads.find((l) => l.id === selId) ?? leads[0];

  const allPicked = pageRows.length > 0 && pageRows.every((l) => picked.has(l.id));
  const togglePage = () => setPicked((p) => { const n = new Set(p); pageRows.forEach((l) => (allPicked ? n.delete(l.id) : n.add(l.id))); return n; });
  const toggleOne = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulk = async (patch: Partial<Lead>) => {
    setRequestError("");
    try {
      const saved = await Promise.all(leads.filter((lead) => picked.has(lead.id)).map(async (lead) => {
        const response = await api.patch(`/leads/${lead.id}`, leadToApi({ ...lead, ...patch }));
        return apiToLead(response.data?.data?.item);
      }));
      setLeads((current) => current.map((lead) => saved.find((item) => item.id === lead.id) ?? lead));
      setPicked(new Set());
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update selected leads.");
    }
  };

  const openForm = (l: Lead) => { setDraft({ ...l }); setFormOpen(true); };
  const set = (k: keyof Lead) => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const invalid = !draft.name.trim() || !draft.phone.trim() || (draft.stage === "Lost" && !draft.lostReason);
  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setRequestError("");
    try {
      const response = draft.id
        ? await api.patch(`/leads/${draft.id}`, leadToApi(draft))
        : await api.post("/leads", leadToApi(draft));
      const saved = apiToLead(response.data?.data?.item);
      setLeads((current) => draft.id
        ? current.map((lead) => lead.id === saved.id ? saved : lead)
        : [saved, ...current]);
      setSelId(saved.id);
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save lead.");
    } finally {
      setSaving(false);
    }
  };

  const dueToday = today ? leads.filter((l) => l.followUp.slice(0, 10) === today && !CLOSED.includes(l.stage)).length : 0;
  const projectStages = ["Lead", "Follow-up", "Site Visit", "Site Survey", "Quotation", "Negotiation", "Won"];
  const pipeline = leads.filter((lead) => projectStages.includes(lead.stage === "Converted" ? "Won" : lead.stage));
  const projects = (pipeTab === "all" ? pipeline : pipeline.filter((lead) => (lead.stage === "Converted" ? "Won" : lead.stage) === pipeTab))
    .map((lead) => ({
      ...lead,
      pipelineStage: lead.stage === "Converted" ? "Won" : lead.stage,
      progress: Math.min(100, Math.round((projectStages.indexOf(lead.stage === "Converted" ? "Won" : lead.stage) / (projectStages.length - 1)) * 100)),
      label: lead.followUp ? `Follow-up: ${fmt(lead.followUp.slice(0, 10))}` : "No follow-up scheduled",
    }));
  const shownProjects = pipeAll ? projects : projects.slice(0, 4);
  const countOf = (k: string) => (k === "all" ? pipeline.length : pipeline.filter((lead) => (lead.stage === "Converted" ? "Won" : lead.stage) === k).length);

  const removeLead = async (lead: Lead) => {
    if (!window.confirm(`Delete lead ${lead.name}?`)) return;
    setRequestError("");
    try {
      await api.delete(`/leads/${lead.id}`);
      setLeads((current) => current.filter((entry) => entry.id !== lead.id));
      setPicked((current) => { const next = new Set(current); next.delete(lead.id); return next; });
      if (selId === lead.id) setSelId("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete lead.");
    }
  };

  const followUpCell = (l: Lead) => {
    if (!l.followUp || CLOSED.includes(l.stage)) return <span className="text-slate-400">—</span>;
    const n = today ? daysBetween(l.followUp, today) : null;
    const note = n === null ? "" : n < 0 ? `(${-n} day${n === -1 ? "" : "s"} overdue)` : n === 0 ? "(Today)" : `(${n} day${n === 1 ? "" : "s"})`;
    return (
      <div className="flex items-start gap-2">
        <CalendarDays size={13} className="mt-1 flex-none text-slate-400" />
        <div>
          <p className="text-[13px] text-slate-700">{fmt(l.followUp)}</p>
          <p className={`text-xs ${n !== null && n < 0 ? "font-semibold text-red-600" : n === 0 ? "font-semibold text-indigo-600" : "text-slate-400"}`}>{note}</p>
        </div>
      </div>
    );
  };

  const triggerCls = "h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 shadow-none";
  const nativeSel = "h-8 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-700";

  return (
    <div className="!space-y-2 text-slate-900">
      {/* header + filters */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">CRM Leads</h1>
          <p className="mt-0.5 text-xs text-slate-500">Track and manage your solar leads from enquiry to conversion.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={stage || null} onValueChange={(value) => filter(setStage)(value ?? "")}>
            <SelectTrigger className={`${triggerCls} w-[130px]`} aria-label="Filter by stage"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Stages</SelectItem>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={source || null} onValueChange={(value) => filter(setSource)(value ?? "")}>
            <SelectTrigger className={`${triggerCls} w-[130px]`} aria-label="Filter by source"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Sources</SelectItem>{sources.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={emp || null} onValueChange={(value) => filter(setEmp)(value ?? "")}>
            <SelectTrigger className={`${triggerCls} w-[150px]`} aria-label="Filter by employee"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Employees</SelectItem>{staff.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
            <CalendarDays size={15} className="text-slate-400" />
            <input type="date" aria-label="From date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="bg-transparent outline-none" />
            <span className="text-slate-400">–</span>
            <input type="date" aria-label="To date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="bg-transparent outline-none" />
          </div>
          <Button className="h-9 rounded-xl bg-slate-950 px-3 text-sm text-white shadow-sm hover:bg-slate-800" disabled={loading} onClick={() => openForm(blank)}><Plus /> Add Lead</Button>
        </div>
      </div>

      {requestError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{requestError}</p>}

      {/* KPIs */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Users size={22} />} tint="bg-indigo-50 text-indigo-500" value={leads.length} label="Total Leads" />
        <Kpi icon={<CalendarClock size={22} />} tint="bg-violet-50 text-violet-500" value={dueToday} label="Follow-ups Today" />
        <Kpi icon={<FileText size={22} />} tint="bg-indigo-50 text-indigo-500" value={leads.filter((l) => l.stage === "Quotation").length} label="Quotation Stage" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-emerald-50 text-emerald-500" value={leads.filter((l) => l.stage === "Converted").length} label="Converted Leads" />
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        {/* ── Leads table ── */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-sm font-bold">Leads</h2>
            {picked.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold text-indigo-600">{picked.size} selected</span>
                <select aria-label="Assign selected leads" className={nativeSel} value="" onChange={(e) => {
                  const assignee = staff.find((person) => person.id === e.target.value);
                  if (assignee) void bulk({ employeeId: assignee.id, employee: assignee.name });
                }}>
                  <option value="">Assign to…</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select aria-label="Change stage of selected leads" className={nativeSel} value="" onChange={(e) => e.target.value && void bulk({ stage: e.target.value })}>
                  <option value="">Change stage…</option>{STAGES.filter((s) => s !== "Lost").map((s) => <option key={s}>{s}</option>)}
                </select>
                <button className="text-slate-500 hover:text-slate-800" onClick={() => setPicked(new Set())}>Clear</button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Showing {rows.length ? (cur - 1) * PAGE_SIZE + 1 : 0}–{Math.min(cur * PAGE_SIZE, rows.length)} of {rows.length} leads</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <th className="w-10 py-2 pl-3"><input type="checkbox" aria-label="Select all leads on this page" className="h-4 w-4 accent-indigo-600" checked={allPicked} onChange={togglePage} /></th>
                  {["Customer", "Phone", "Location", "Lead Stage", "Source", "Assigned To", "Next Follow-up"].map((h) => <th key={h} className="px-2.5 py-2 font-semibold">{h}</th>)}
                  <th className="px-2.5 py-2 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && leads.length === 0 && <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-500">Loading leads...</td></tr>}
                {pageRows.map((l) => (
                  <tr key={l.id} onClick={() => setSelId(l.id)} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70 ${l.id === sel?.id ? "bg-indigo-50/50" : ""}`}>
                    <td className="py-2.5 pl-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${l.name}`} className="h-4 w-4 accent-indigo-600" checked={picked.has(l.id)} onChange={() => toggleOne(l.id)} /></td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">{initials(l.name)}</span>
                        <div><p className="text-[13px] font-semibold">{l.name}</p><p className="text-xs text-slate-400">{l.type}</p></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2.5 text-xs text-slate-700"><a href={`tel:${l.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="hover:text-indigo-600 hover:underline">{l.phone}</a></td>
                    <td className="px-2.5 text-xs text-slate-700">{l.location}</td>
                    <td className="px-2.5"><Badge cls={stageCls[l.stage] ?? stageCls.Lead}>{l.stage}</Badge></td>
                    <td className="px-2.5"><Badge cls="bg-slate-100 text-slate-600">{l.source || "—"}</Badge></td>
                    <td className="px-2.5">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-700">
                        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-sky-100 text-[9px] font-semibold text-sky-700">{initials(l.employee)}</span>{l.employee}
                      </div>
                    </td>
                    <td className="px-3">{followUpCell(l)}</td>
                    <td className="px-3 text-center"><RowMenu lead={l} onView={() => setView(l)} onEdit={() => openForm(l)} onDelete={() => void removeLead(l)} /></td>
                  </tr>
                ))}
                {pageRows.length === 0 && <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-500">No leads match these filters. Change a filter or add a new lead.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-1 border-t border-slate-100 py-3">
            <button aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={15} /></button>
            {pageNums.map((n) => (
              <button key={n} aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n)} className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-medium ${n === cur ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{n}</button>
            ))}
            <button aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </section>

        {/* ── Right column ── */}
        <div className="space-y-2">
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Project Pipeline</h2>
              <button onClick={() => setPipeAll((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">{pipeAll ? "Show less" : "View All Projects"} <ArrowRight size={12} /></button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {PIPE_TABS.map((t) => (
                <button key={t.key} onClick={() => { setPipeTab(t.key); setPipeAll(false); }} aria-pressed={pipeTab === t.key}
                  className={`rounded-lg border px-1.5 py-2 text-left ${pipeTab === t.key ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <span className="flex items-center gap-1 text-[11px] leading-tight text-slate-500"><i className={`h-1.5 w-1.5 flex-none rounded-full ${t.dot}`} /><span className="truncate">{t.label}</span></span>
                  <span className="mt-1 block text-center text-lg font-bold leading-none">{countOf(t.key)}</span>
                </button>
              ))}
            </div>

            <ul className={`mt-2 ${pipeAll ? "max-h-[420px] overflow-y-auto" : ""}`}>
              {shownProjects.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-indigo-50 text-indigo-500">{p.type === "Commercial" ? <Building2 size={16} /> : <Home size={16} />}</span>
                  <div className="w-[88px] flex-none">
                    <p className="truncate text-[13px] font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.kw} kW · Rooftop</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge cls={pipeCls[p.pipelineStage].badge}>{p.pipelineStage}</Badge>
                      <span className="text-[11px] font-medium text-slate-500">{p.progress}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`h-full rounded-full ${pipeCls[p.pipelineStage].bar}`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-[13px] font-bold">{inr(p.amount)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{p.label}</p>
                  </div>
                </li>
              ))}
              {shownProjects.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No projects in this stage.</li>}
            </ul>
          </section>

          {sel && (
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Site Survey / Quotation Preview</h2>
                <button onClick={() => setView(sel)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">View Details <ArrowRight size={12} /></button>
              </div>
              <div className="mt-3 flex gap-3">
                <div className="h-[84px] w-[132px] flex-none overflow-hidden rounded-lg"><SolarHouse /></div>
                <div className="min-w-0 space-y-1.5">
                  <Badge cls={["Site Survey", "Quotation", "Converted"].includes(sel.stage) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {["Site Survey", "Quotation", "Converted"].includes(sel.stage) ? "Survey Completed" : "Survey Pending"}
                  </Badge>
                  <p className="flex items-center gap-2 text-[13px] font-semibold"><User size={14} className="flex-none text-slate-500" /><span className="truncate">{sel.name}</span></p>
                  <p className="flex items-center gap-2 text-[13px] text-slate-600"><Phone size={14} className="flex-none text-slate-500" />{sel.phone}</p>
                  <p className="flex items-center gap-2 text-[13px] text-slate-600"><MapPin size={14} className="flex-none text-slate-500" /><span className="truncate">{sel.location}</span></p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
                {[
                  { icon: <Sun size={16} />, top: `${sel.kw || "—"} kW`, sub: "Rooftop System" },
                  { icon: <CalendarCheck size={16} />, top: fmt(sel.followUp.slice(0, 10)), sub: "Next Follow-up" },
                  { icon: <Users size={16} />, top: sel.employee, sub: "Assigned Team" },
                ].map((m) => (
                  <div key={m.sub} className="flex items-start gap-2">
                    <span className="mt-0.5 text-indigo-500">{m.icon}</span>
                    <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{m.top}</p><p className="text-[11px] text-slate-400">{m.sub}</p></div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-indigo-50/60 p-3">
                <div><p className="text-xs text-slate-500">Quotation Amount</p><p className="text-lg font-bold">{sel.amount ? inr(sel.amount) : "—"}</p></div>
                <div><p className="text-xs text-slate-500">Subsidy (est.)</p><p className="text-lg font-bold">{sel.type === "Residential" ? inr(subsidy(sel)) : "N/A"}</p></div>
                <Button className="h-9 rounded-xl bg-slate-950 px-3 text-sm text-white hover:bg-slate-800" onClick={() => setView(sel)}>View Quotation <ArrowRight /></Button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Add / Edit → Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 !max-w-2xl">
          <SheetHeader className="border-b border-slate-200 px-4 py-2.5 text-left">
            <SheetTitle className="text-lg font-bold">{draft.id ? "Edit lead" : "New lead"}</SheetTitle>
            <SheetDescription>{draft.id ? "Update the details, then save." : "Fill in the lead details, then save."}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <Tabs defaultValue="lead">
              <TabsList className={`${tabsListCls} mb-3 h-9`}>
                <TabsTrigger value="lead" className={tabCls}>Lead</TabsTrigger>
                <TabsTrigger value="follow" className={tabCls}>Follow-up</TabsTrigger>
                <TabsTrigger value="notes" className={tabCls}>Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="lead" className="grid gap-3 sm:grid-cols-2 [&_input]:h-10 [&_label]:text-xs [&_button[data-slot=select-trigger]]:h-10">
                <TextField className="sm:col-span-2" label="Name" value={draft.name} onChange={set("name")} placeholder="Anil Gupta" />
                <TextField label="Phone" type="tel" value={draft.phone} onChange={set("phone")} placeholder="98765 43210" />
                <SelectField label="Customer type" value={draft.type} onChange={set("type")} options={TYPES} />
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">Source
                  <select value={draft.sourceId} onChange={(event) => {
                    const selected = sources.find((item) => item.id === event.target.value);
                    setDraft((current) => ({ ...current, sourceId: selected?.id ?? "", source: selected?.name ?? "" }));
                  }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Select a source</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <TextField label="System size (kW)" type="number" value={draft.kw} onChange={set("kw")} placeholder="5" />
                <TextField className="sm:col-span-2" label="Location" value={draft.location} onChange={set("location")} placeholder="Area, city" />
                <TextField className="sm:col-span-2" label="Quotation amount (₹)" type="number" value={draft.amount} onChange={set("amount")} placeholder="250000" />
              </TabsContent>
              <TabsContent value="follow" className="grid gap-3 sm:grid-cols-2 [&_input]:h-10 [&_label]:text-xs [&_button[data-slot=select-trigger]]:h-10">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">Assigned employee
                  <select value={draft.employeeId} onChange={(event) => {
                    const selected = staff.find((item) => item.id === event.target.value);
                    setDraft((current) => ({ ...current, employeeId: selected?.id ?? "", employee: selected?.name ?? "" }));
                  }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Unassigned</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <SelectField label="Stage" value={draft.stage} onChange={set("stage")} options={STAGES} />
                <TextField label="Next follow-up date and time" type="datetime-local" value={draft.followUp.length === 10 ? `${draft.followUp}T09:00` : draft.followUp} onChange={set("followUp")} />
                <SelectField label="Follow-up type" value={draft.followUpType} onChange={set("followUpType")} options={["Call", "WhatsApp", "Visit", "Email"]} />
                <SelectField label="Priority" value={draft.priority} onChange={set("priority")} options={["Low", "Medium", "High"]} />
                <label className="flex items-center gap-2 self-center text-sm text-slate-700"><input type="checkbox" checked={draft.reminder} onChange={(event) => setDraft((current) => ({ ...current, reminder: event.target.checked }))} className="h-4 w-4 rounded border-slate-300" />Reminder</label>
                <div className="sm:col-span-2"><AreaField label="Follow-up notes and outcome" rows={3} value={draft.followUpNotes} onChange={set("followUpNotes")} /></div>
                {draft.stage === "Lost" && <SelectField className="sm:col-span-2" label="Lost reason" value={draft.lostReason} onChange={set("lostReason")} options={LOST_REASONS} placeholder="Select a reason" />}
              </TabsContent>
              <TabsContent value="notes" className="grid gap-3 sm:grid-cols-2 [&_input]:h-10 [&_label]:text-xs">
                <div className="sm:col-span-2"><AreaField label="Customer requirement" rows={3} value={draft.requirement} onChange={set("requirement")} /></div>
                <TextField label="Monthly electricity bill (optional)" type="number" value={draft.monthlyBill} onChange={set("monthlyBill")} placeholder="5000" />
                <TextField label="Roof type / available area (if known)" value={draft.roofType} onChange={set("roofType")} placeholder="RCC, 800 sq. ft." />
                <TextField className="sm:col-span-2" label="Budget or financing requirement" value={draft.budget} onChange={set("budget")} placeholder="Budget or loan requirement" />
                <div className="sm:col-span-2"><AreaField label="Additional notes" rows={3} value={draft.notes} onChange={set("notes")} /></div>
              </TabsContent>
            </Tabs>
          </div>
          <SheetFooter className="flex-col gap-2 border-t border-slate-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end">
            {invalid && <span className="text-xs text-muted-foreground sm:mr-auto">{draft.stage === "Lost" && !draft.lostReason ? "Choose a lost reason." : "Name and phone are required."}</span>}
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 flex-1 rounded-xl border-slate-200 px-3 sm:flex-none" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button className="h-9 flex-1 rounded-xl bg-slate-950 px-3 text-white hover:bg-slate-800 sm:flex-none" disabled={invalid || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save lead"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View → Dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-0 sm:max-w-xl">
          {view && (
            <>
              <DialogHeader className="shrink-0 flex-row items-center gap-2 rounded-xl bg-slate-50/70 p-2 pr-10">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(view.name)}</span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-base font-bold text-slate-900">{view.name}</DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">{`${view.type} · ${view.source} · ${view.location}`}</DialogDescription>
                </div>
                <Badge cls={stageCls[view.stage] ?? stageCls.Lead}>{view.stage}</Badge>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-1">
                <div className="grid gap-2 sm:grid-cols-2">
                  <KV label="Phone"><a href={`tel:${view.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-indigo-700"><Phone size={15} />{view.phone}</a></KV>
                  <KV label="WhatsApp"><a target="_blank" rel="noreferrer" href={`https://wa.me/91${view.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 text-emerald-700"><MessageCircle size={15} />Chat</a></KV>
                  <KV label="Assigned to">{view.employee}</KV>
                  <KV label="Next follow-up">{CLOSED.includes(view.stage) ? "—" : fmt(view.followUp)}</KV>
                  <KV label="System size">{view.kw ? `${view.kw} kW` : "—"}</KV>
                  <KV label="Quotation">{view.amount ? inr(view.amount) : "—"}</KV>
                  {view.stage === "Lost" && <KV label="Lost reason">{view.lostReason}</KV>}
                </div>
                <div><p className="mb-1 text-xs font-semibold">Notes</p><p className="text-sm text-muted-foreground">{view.notes || "No notes yet."}</p></div>
              </div>
              <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-end">
                <Button variant="outline" className="h-9 rounded-xl border-slate-200 px-3" onClick={() => setView(null)}>Close</Button>
                <Button className="h-9 rounded-xl bg-slate-950 px-3 text-white shadow-sm hover:bg-slate-800" onClick={() => { const v = view; setView(null); openForm(v); }}><Pencil /> Edit lead</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
