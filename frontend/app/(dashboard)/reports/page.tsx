"use client";

import { Avatar, PageHeader, Panel, StatCard, StatusBadge, Tone } from "@/components/ui/page-layout";
import { inr, pillList, pillTrig, thCls } from "@/components/master/module-kit";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Boxes, Building2, CalendarClock,
  ChartBar, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, Download,
  FileText, Headphones, IndianRupee, Package, Percent, PhoneCall, Plus, Receipt, Sun,
  Target, Users, Wallet, Wrench, X, Layers, FolderKanban, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

/* =========================================================
   PERIODS
   ========================================================= */
const PERIODS: Record<string, string> = {
  today: "Today", week: "This week", month: "This month",
  quarter: "This quarter", fy: "This financial year", custom: "Custom range",
};

/* =========================================================
   DEMO DATA (structure of API payload)
   ========================================================= */
const KPIS = {
  bookedSales: 2180000, collections: 1520000, outstanding: 1070000, newLeads: 40,
  installations: 7, activeProjects: 6, inventoryValue: 840000, expenses: 310000,
};

const ATTENTION = [
  { label: "Delayed solar projects", count: 2, href: "/projects?status=delayed", tone: "red" as Tone },
  { label: "Overdue customer payments", count: 5, href: "/payments?status=overdue", tone: "amber" as Tone },
  { label: "Low-stock items", count: 4, href: "/inventory?stock=low", tone: "indigo" as Tone },
];

const LEAD_SOURCES = [
  { name: "Referral", leads: 10, won: 3, revenue: 820000 },
  { name: "Facebook ad", leads: 14, won: 2, revenue: 560000 },
  { name: "Website", leads: 8, won: 2, revenue: 520000 },
  { name: "WhatsApp", leads: 6, won: 1, revenue: 280000 },
  { name: "Walk-in / calls", leads: 2, won: 0, revenue: 0 },
];
const FUNNEL = [
  { label: "New leads", value: 40 }, { label: "Site surveys done", value: 26 },
  { label: "Quotations sent", value: 18 }, { label: "Deals won", value: 8 },
];
const TEAM_PERF = [
  { name: "Rohit Sharma", leads: 16, surveys: 10, quotes: 8, won: 3, revenue: 880000, ontime: 88 },
  { name: "Neha Verma", leads: 14, surveys: 8, quotes: 6, won: 3, revenue: 760000, ontime: 93 },
  { name: "Imran Khan", leads: 10, surveys: 8, quotes: 4, won: 2, revenue: 540000, ontime: 79 },
];

const INSTALLED_KW = [
  { month: "May", kw: 42 }, { month: "Jun", kw: 55 }, { month: "Jul", kw: 48 },
  { month: "Aug", kw: 63 }, { month: "Sep", kw: 71 }, { month: "Oct", kw: 58 },
];
const PROJECT_STATUS = [
  { label: "On track", count: 4, tone: "indigo" as Tone },
  { label: "Delayed", count: 2, tone: "red" as Tone },
  { label: "Completed", count: 7, tone: "green" as Tone },
];

/* Revenue chart — this year vs last year (₹ lakh) */
const REVENUE_TREND = {
  thisYear: [18, 22, 25, 28, 26, 31, 34, 30, 36, 39, 42, 45],
  lastYear: [14, 16, 18, 20, 21, 22, 24, 23, 26, 28, 30, 31],
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/* Top expenses — donut */
const TOP_EXPENSES = [
  { label: "Material", value: 120000, color: "#6366f1" },
  { label: "Salary", value: 80000, color: "#f59e0b" },
  { label: "Transport", value: 55000, color: "#10b981" },
  { label: "Rent", value: 35000, color: "#ec4899" },
  { label: "Misc", value: 20000, color: "#94a3b8" },
];

const AGING = [
  { range: "0–30 days", amount: 640000, tone: "indigo" as Tone },
  { range: "31–60 days", amount: 310000, tone: "amber" as Tone },
  { range: "Over 60 days", amount: 120000, tone: "red" as Tone },
];
const FINANCING = [
  { mode: "Cash payment", count: 4, amount: 820000 },
  { mode: "Bank loan", count: 2, amount: 640000 },
  { mode: "NBFC / Kisht", count: 1, amount: 320000 },
];

const STOCK_SUMMARY = [
  { label: "Solar panels", value: 320000 },
  { label: "Inverters", value: 240000 },
  { label: "Structure & cables", value: 180000 },
  { label: "Batteries", value: 100000 },
];
const LOW_STOCK = [
  { item: "540W Mono panel", available: 3, min: 10 },
  { item: "5kW Inverter", available: 1, min: 4 },
  { item: "DC Cable 4mm (m)", available: 40, min: 100 },
  { item: "MC4 connectors", available: 8, min: 25 },
];

const HR_STATS = { attendance: 92, leavesToday: 2, pendingTasks: 14, topPerformer: "Neha Verma" };
const SERVICE_STATS = { openComplaints: 5, resolvedThisMonth: 12, amcRenewalsDue: 3, warrantyExpiring: 2 };
const IVR_STATS = { incoming: 128, answered: 116, missed: 12, missedFollowed: 9, convertedLeads: 6 };

/* Recent activities feed */
const ACTIVITIES = [
  { icon: "invoice", title: "New invoice raised", detail: "INV-1024 · Hotel Taj View", time: "2m ago", color: "bg-indigo-50 text-indigo-600" },
  { icon: "payment", title: "Payment received", detail: "₹65,000 · Meena Traders", time: "15m ago", color: "bg-emerald-50 text-emerald-600" },
  { icon: "project", title: "Project completed", detail: "5kW installation · Rekha Devi", time: "1h ago", color: "bg-amber-50 text-amber-600" },
  { icon: "lead", title: "New lead assigned", detail: "Anil Gupta · Rohit Sharma", time: "3h ago", color: "bg-sky-50 text-sky-600" },
  { icon: "stock", title: "Low stock alert", detail: "540W Mono panel — 3 left", time: "5h ago", color: "bg-rose-50 text-rose-600" },
];

/* =========================================================
   HELPERS
   ========================================================= */
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const box = "rounded-2xl border border-slate-200 bg-white p-5";

const exportCsv = (name: string, head: string[], rows: (string | number)[][]) => {
  const csv = [head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href);
};

/* =========================================================
   PREMIUM STAT CARD (image style)
   ========================================================= */
type PremiumTone = "indigo" | "rose" | "emerald" | "amber" | "sky" | "violet";

const TONE_BG: Record<PremiumTone, { wrap: string; icon: string; badge: string }> = {
  indigo: { wrap: "from-indigo-50/70 via-white to-white border-indigo-100", icon: "bg-indigo-100 text-indigo-600", badge: "bg-indigo-50 text-indigo-700" },
  rose:   { wrap: "from-rose-50/70 via-white to-white border-rose-100",       icon: "bg-rose-100 text-rose-600",       badge: "bg-rose-50 text-rose-700" },
  emerald:{ wrap: "from-emerald-50/70 via-white to-white border-emerald-100", icon: "bg-emerald-100 text-emerald-600", badge: "bg-emerald-50 text-emerald-700" },
  amber:  { wrap: "from-amber-50/70 via-white to-white border-amber-100",     icon: "bg-amber-100 text-amber-600",     badge: "bg-amber-50 text-amber-700" },
  sky:    { wrap: "from-sky-50/70 via-white to-white border-sky-100",         icon: "bg-sky-100 text-sky-600",         badge: "bg-sky-50 text-sky-700" },
  violet: { wrap: "from-violet-50/70 via-white to-white border-violet-100",   icon: "bg-violet-100 text-violet-600",   badge: "bg-violet-50 text-violet-700" },
};

function PremiumStatCard({
  icon, label, value, trend, trendLabel, tone = "indigo",
}: {
  icon: React.ReactNode; label: string; value: string | number;
  trend?: number; trendLabel?: string; tone?: PremiumTone;
}) {
  const t = TONE_BG[tone];
  const up = (trend ?? 0) >= 0;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:shadow-md ${t.wrap}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${t.icon}`}>{icon}</div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
          <span className="text-xs text-muted-foreground">{trendLabel ?? "vs last month"}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   AREA LINE CHART (SVG — this year vs last year)
   ========================================================= */
function AreaLineChart({
  data, data2, labels, height = 240,
}: {
  data: number[]; data2?: number[]; labels: string[]; height?: number;
}) {
  const w = 640, pad = { t: 16, r: 16, b: 28, l: 32 };
  const all = data2 ? [...data, ...data2] : data;
  const max = Math.max(...all) * 1.15;
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (i * iw) / (labels.length - 1);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const toArea = (arr: number[]) =>
    `${toPath(arr)} L${x(arr.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y grid */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * (1 - f)} y2={pad.t + ih * (1 - f)} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {/* Last year — dashed */}
        {data2 && (
          <path d={toPath(data2)} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
        )}
        {/* This year — filled area */}
        <path d={toArea(data)} fill="url(#areaFill)" />
        <path d={toPath(data)} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {data.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke="#6366f1" strokeWidth={2} />
        ))}
        {/* X labels */}
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={height - 6} fontSize={11} fill="#94a3b8" textAnchor="middle">{l}</text>
        ))}
      </svg>
      <div className="mt-2 flex justify-center gap-5 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-indigo-600" /> This year</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-slate-400" style={{ borderTop: "1px dashed #94a3b8", height: 0 }} /> Last year</span>
      </div>
    </div>
  );
}

/* =========================================================
   DONUT CHART (SVG)
   ========================================================= */
function DonutChart({ data, size = 180 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = size / 2 - 18;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
          {data.map((d) => {
            const len = (d.value / total) * c;
            const el = (
              <circle key={d.label} r={r} fill="none" stroke={d.color} strokeWidth={22}
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />
            );
            acc += len;
            return el;
          })}
        </g>
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize={12} fill="#94a3b8">Total</text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize={16} fontWeight="700" fill="#0f172a">
          {inr(total)}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-700">{d.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-slate-900">{inr(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS (reused)
   ========================================================= */
function AttentionCard({ item }: { item: (typeof ATTENTION)[number] }) {
  const tone = item.tone === "red" ? "bg-rose-50 text-rose-600" : item.tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600";
  return (
    <a href={item.href} className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><AlertTriangle size={16} /></div>
        <div>
          <p className="text-sm font-medium text-slate-800">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.count} item{item.count > 1 ? "s" : ""} need action</p>
        </div>
      </div>
      <span className="text-lg font-bold tabular-nums text-slate-900">{item.count}</span>
      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-600" />
    </a>
  );
}

function ProgressRow({ label, value, total, tone = "indigo", suffix }: {
  label: string; value: number; total: number; tone?: "indigo" | "green" | "amber" | "red"; suffix?: string;
}) {
  const m = { indigo: "bg-indigo-600", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500" };
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{suffix ?? value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${m[tone]}`} style={{ width: `${pct(value, total)}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon, action }: {
  title: string; subtitle?: string; icon?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-700">{icon}</div>}
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function BarChart({ data, max, unit = "" }: { data: { label: string; value: number }[]; max: number; unit?: string }) {
  return (
    <div className="flex h-52 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-semibold tabular-nums">{d.value}{unit}</span>
          <div className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400"
            style={{ height: `${Math.max(4, Math.round((d.value / max) * 150))}px` }} />
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   ACTIVITY FEED
   ========================================================= */
const ACT_ICON: Record<string, React.ReactNode> = {
  invoice: <Receipt size={15} />, payment: <Wallet size={15} />, project: <Sun size={15} />,
  lead: <Target size={15} />, stock: <Boxes size={15} />,
};

function ActivityFeed() {
  return (
    <div className={box}>
      <SectionHeader title="Recent activities" subtitle="Latest business updates" icon={<Activity size={16} />} />
      <ul className="space-y-3">
        {ACTIVITIES.map((a) => (
          <li key={a.title} className="flex items-start gap-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.color}`}>
              {ACT_ICON[a.icon]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
            </div>
            <span className="text-xs text-slate-400">{a.time}</span>
          </li>
        ))}
      </ul>
      <button className="mt-4 w-full rounded-lg bg-slate-50 py-2 text-xs font-medium text-indigo-600 hover:bg-slate-100">
        View all activities
      </button>
    </div>
  );
}

/* =========================================================
   MIS MODAL (unchanged)
   ========================================================= */
const MIS_SECTIONS = [
  { id: "overview", label: "Executive Overview", icon: ChartBar },
  { id: "sales", label: "Sales & CRM", icon: Target },
  { id: "projects", label: "Solar Projects", icon: Sun },
  { id: "finance", label: "Finance & Payments", icon: Wallet },
  { id: "inventory", label: "Inventory & Warehouse", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "hr", label: "HR & Team", icon: Building2 },
  { id: "service", label: "Service & AMC", icon: Wrench },
  { id: "ivr", label: "Calls & IVR", icon: PhoneCall },
];

function MisReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [period, setPeriod] = useState("month");
  const [selected, setSelected] = useState<Set<string>>(new Set(MIS_SECTIONS.map((s) => s.id)));
  const toggle = (id: string) => {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><FileText size={20} /></div>
            <div>
              <p className="text-base font-semibold">Generate Business MIS</p>
              <p className="text-sm text-muted-foreground">Choose report period and included sections</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Reporting period</p>
            <div className="flex flex-wrap gap-2">
              {["month", "quarter", "fy"].map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${period === p ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                  {PERIODS[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Include sections</p>
              <button type="button"
                onClick={() => setSelected(selected.size === MIS_SECTIONS.length ? new Set() : new Set(MIS_SECTIONS.map((s) => s.id)))}
                className="text-xs font-medium text-indigo-600 hover:underline">
                {selected.size === MIS_SECTIONS.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MIS_SECTIONS.map((s) => {
                const Icon = s.icon; const checked = selected.has(s.id);
                return (
                  <label key={s.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition ${checked ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                    <Icon size={15} className={checked ? "text-indigo-600" : "text-slate-400"} />
                    <span className="text-sm font-medium text-slate-700">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-muted-foreground">
            This configuration generates a report structure. Live PDF/Excel download becomes available after backend MIS APIs are connected.
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-slate-950 text-white hover:bg-slate-800" disabled={!selected.size}
            onClick={() => exportCsv("mis-report", ["Section", "Period", "Status"],
              Array.from(selected).map((id) => [MIS_SECTIONS.find((m) => m.id === id)?.label ?? id, PERIODS[period], "Stub"]))}>
            <FileText size={15} /> Build MIS report
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */
export default function ReportsPage() {
  const [period, setPeriod] = useState("month");
  const [tab, setTab] = useState("overview");
  const [misOpen, setMisOpen] = useState(false);

  const collectionRate = pct(KPIS.collections, KPIS.bookedSales);
  const conversionRate = pct(8, KPIS.newLeads);

  const onExportTab = () => {
    if (tab === "sales") exportCsv("lead-source-report", ["Source", "Leads", "Won", "Conv %", "Revenue"],
      LEAD_SOURCES.map((s) => [s.name, s.leads, s.won, pct(s.won, s.leads), s.revenue]));
    if (tab === "projects") exportCsv("installed-capacity", ["Month", "kW"], INSTALLED_KW.map((m) => [m.month, m.kw]));
    if (tab === "finance") exportCsv("finance-report", ["Month", "Revenue (L)", "Collected (L)"],
      REVENUE_TREND.months.slice(0, 6).map((m, i) => [m, REVENUE_TREND.thisYear[i], REVENUE_TREND.lastYear[i]]));
    if (tab === "inventory") exportCsv("low-stock", ["Item", "Available", "Min"], LOW_STOCK.map((l) => [l.item, l.available, l.min]));
    if (tab === "hr") exportCsv("team-performance",
      ["Employee", "Leads", "Surveys", "Quotes", "Won", "Revenue", "On-time %"],
      TEAM_PERF.map((t) => [t.name, t.leads, t.surveys, t.quotes, t.won, t.revenue, t.ontime]));
  };

  return (
    <div className="!space-y-3">
      <PageHeader title="Reports & analytics" subtitle="Owner MIS · one click overview of sales, projects, finance, inventory, team and service.">
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-white" aria-label="Period"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PERIODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="lg" className="h-10 rounded-xl" onClick={onExportTab}>
            <Download size={16} /> Export CSV
          </Button>
          <Button size="lg" className="h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800" onClick={() => setMisOpen(true)}>
            <FileText size={16} /> Full MIS report
          </Button>
        </div>
      </PageHeader>

      {/* ---------- Premium KPI grid (image style) ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard icon={<IndianRupee size={20} />} label="Booked sales" value={inr(KPIS.bookedSales)} trend={12.5} tone="indigo" />
        <PremiumStatCard icon={<Wallet size={20} />} label="Collections" value={inr(KPIS.collections)} trend={8.2} tone="emerald" />
        <PremiumStatCard icon={<CircleDollarSign size={20} />} label="Outstanding" value={inr(KPIS.outstanding)} trend={-4.6} tone="rose" />
        <PremiumStatCard icon={<Target size={20} />} label="New leads" value={KPIS.newLeads} trend={15.3} tone="sky" />
        <PremiumStatCard icon={<Sun size={20} />} label="Installations" value={KPIS.installations} trend={7.1} tone="amber" />
        <PremiumStatCard icon={<ClipboardCheck size={20} />} label="Active projects" value={KPIS.activeProjects} trend={3.2} tone="violet" />
        <PremiumStatCard icon={<Boxes size={20} />} label="Inventory value" value={inr(KPIS.inventoryValue)} trend={2.4} tone="indigo" />
        <PremiumStatCard icon={<Receipt size={20} />} label="Expenses" value={inr(KPIS.expenses)} trend={-3.6} tone="rose" />
      </div>

      {/* ---------- Attention required ---------- */}
      <Panel className="p-5">
        <SectionHeader title="Owner attention required" subtitle="Items needing quick follow-up" icon={<AlertTriangle size={18} />} />
        <div className="grid gap-2 md:grid-cols-3">
          {ATTENTION.map((a) => <AttentionCard key={a.label} item={a} />)}
        </div>
      </Panel>

      {/* ---------- Tabs ---------- */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto border-b border-slate-100 p-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={pillList}>
              <TabsTrigger value="overview" className={pillTrig}>Overview</TabsTrigger>
              <TabsTrigger value="sales" className={pillTrig}>Sales & CRM</TabsTrigger>
              <TabsTrigger value="projects" className={pillTrig}>Projects</TabsTrigger>
              <TabsTrigger value="finance" className={pillTrig}>Finance</TabsTrigger>
              <TabsTrigger value="inventory" className={pillTrig}>Inventory</TabsTrigger>
              <TabsTrigger value="customers" className={pillTrig}>Customers</TabsTrigger>
              <TabsTrigger value="hr" className={pillTrig}>HR & Team</TabsTrigger>
              <TabsTrigger value="service" className={pillTrig}>Service & AMC</TabsTrigger>
              <TabsTrigger value="ivr" className={pillTrig}>Calls & IVR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={tab} onValueChange={setTab}>

          {/* ================= OVERVIEW ================= */}
          <TabsContent value="overview" className="p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Revenue Overview — big line chart */}
              <div className={`${box} lg:col-span-2`}>
                <SectionHeader
                  title="Revenue Overview"
                  subtitle="This year vs last year (₹ lakh)"
                  icon={<ChartBar size={16} />}
                  action={
                    <Select defaultValue="thisYear">
                      <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="thisYear">This year</SelectItem></SelectContent>
                    </Select>
                  }
                />
                <AreaLineChart data={REVENUE_TREND.thisYear} data2={REVENUE_TREND.lastYear} labels={REVENUE_TREND.months} />
              </div>

              {/* Top Expenses donut */}
              <div className={box}>
                <SectionHeader
                  title="Top Expenses"
                  subtitle="This month"
                  icon={<Receipt size={16} />}
                  action={
                    <Select defaultValue="month">
                      <SelectTrigger className="h-8 w-[110px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="month">This month</SelectItem></SelectContent>
                    </Select>
                  }
                />
                <DonutChart data={TOP_EXPENSES} />
              </div>

              {/* Recent activities + Sales funnel */}
              <div className="lg:col-span-1"><ActivityFeed /></div>

              <div className={box}>
                <SectionHeader title="Sales funnel" subtitle="This month" icon={<Target size={16} />} />
                <div className="space-y-3">
                  {FUNNEL.map((f, i) => (
                    <ProgressRow key={f.label} label={f.label} value={f.value} total={FUNNEL[0].value}
                      tone={i === FUNNEL.length - 1 ? "green" : "indigo"}
                      suffix={`${f.value}${i > 0 ? ` (${pct(f.value, FUNNEL[i - 1].value)}%)` : ""}`} />
                  ))}
                </div>
              </div>

              <div className={box}>
                <SectionHeader title="Projects right now" subtitle="Status snapshot" icon={<Sun size={16} />} />
                <div className="space-y-3">
                  {PROJECT_STATUS.map((p) => (
                    <ProgressRow key={p.label} label={p.label} value={p.count}
                      total={PROJECT_STATUS.reduce((a, x) => a + x.count, 0)}
                      tone={p.tone as never} suffix={`${p.count}`} />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ================= SALES & CRM ================= */}
          <TabsContent value="sales" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<Users size={20} />} label="Total leads" value={40} trend={12} tone="indigo" />
              <PremiumStatCard icon={<CheckCircle2 size={20} />} label="Deals won" value={8} trend={14} tone="emerald" />
              <PremiumStatCard icon={<Percent size={20} />} label="Conversion rate" value={`${conversionRate}%`} trend={3} tone="amber" />
              <PremiumStatCard icon={<CalendarClock size={20} />} label="Pending follow-ups" value={6} trend={-2} tone="rose" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={box}>
                <SectionHeader title="Lead source performance" subtitle="Which source brings paying customers" icon={<Target size={16} />} />
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>{["Source", "Leads", "Won", "Conv.", "Revenue"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {LEAD_SOURCES.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="px-4 font-medium">{s.name}</TableCell>
                        <TableCell className="px-4">{s.leads}</TableCell>
                        <TableCell className="px-4">{s.won}</TableCell>
                        <TableCell className="px-4">{pct(s.won, s.leads)}%</TableCell>
                        <TableCell className="px-4 font-semibold">{inr(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className={box}>
                <SectionHeader title="Sales team performance" subtitle="Leads, won, revenue" icon={<Users size={16} />} />
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>{["Employee", "Leads", "Won", "Revenue"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {TEAM_PERF.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2.5"><Avatar name={t.name} /><span className="font-medium">{t.name}</span></div>
                        </TableCell>
                        <TableCell className="px-4">{t.leads}</TableCell>
                        <TableCell className="px-4">{t.won}</TableCell>
                        <TableCell className="px-4 font-semibold">{inr(t.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ================= PROJECTS ================= */}
          <TabsContent value="projects" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<ClipboardCheck size={20} />} label="Site surveys" value={26} trend={10} tone="indigo" />
              <PremiumStatCard icon={<Sun size={20} />} label="Installations done" value={7} trend={6} tone="emerald" />
              <PremiumStatCard icon={<AlertTriangle size={20} />} label="Delayed projects" value={2} trend={-15} tone="rose" />
              <PremiumStatCard icon={<Sun size={20} />} label="Total installed" value={`${INSTALLED_KW.reduce((a, x) => a + x.kw, 0)} kW`} trend={9} tone="amber" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={box}>
                <SectionHeader title="Installed capacity" subtitle="kW commissioned, last 6 months" icon={<Sun size={16} />} />
                <BarChart data={INSTALLED_KW.map((m) => ({ label: m.month, value: m.kw }))} max={80} unit=" kW" />
              </div>
              <div className={box}>
                <SectionHeader title="Project status" subtitle="Current pipeline" icon={<ClipboardCheck size={16} />} />
                <div className="space-y-3">
                  {PROJECT_STATUS.map((p) => (
                    <ProgressRow key={p.label} label={p.label} value={p.count}
                      total={PROJECT_STATUS.reduce((a, x) => a + x.count, 0)}
                      tone={p.tone as never} suffix={`${p.count}`} />
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  2 projects are past their target date.{" "}
                  <a href="/projects?status=delayed" className="font-semibold underline-offset-2 hover:underline">View delayed projects →</a>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ================= FINANCE ================= */}
          <TabsContent value="finance" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<IndianRupee size={20} />} label="Revenue booked" value={inr(KPIS.bookedSales)} trend={12} tone="indigo" />
              <PremiumStatCard icon={<Wallet size={20} />} label="Collected" value={inr(KPIS.collections)} trend={8} tone="emerald" />
              <PremiumStatCard icon={<CircleDollarSign size={20} />} label="Outstanding" value={inr(KPIS.outstanding)} trend={-4} tone="rose" />
              <PremiumStatCard icon={<Percent size={20} />} label="Collection rate" value={`${collectionRate}%`} trend={5} tone="amber" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={`${box} lg:col-span-2`}>
                <SectionHeader title="Revenue vs collected" subtitle="Monthly trend (₹ lakh)" icon={<ChartBar size={16} />} />
                <AreaLineChart
                  data={REVENUE_TREND.thisYear.slice(0, 6)}
                  data2={REVENUE_TREND.lastYear.slice(0, 6)}
                  labels={REVENUE_TREND.months.slice(0, 6)}
                  height={220}
                />
              </div>
              <div className={box}>
                <SectionHeader title="Outstanding by age" subtitle="Receivable buckets" icon={<CircleDollarSign size={16} />} />
                <div className="space-y-3">
                  {AGING.map((a) => <ProgressRow key={a.range} label={a.range} value={a.amount} total={AGING[0].amount} tone={a.tone as never} suffix={inr(a.amount)} />)}
                </div>
              </div>
              <div className={box}>
                <SectionHeader title="Payment mode breakdown" subtitle="Cash vs financed installations" icon={<Banknote size={16} />} />
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>{["Mode", "Deals", "Amount"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {FINANCING.map((f) => (
                      <TableRow key={f.mode}>
                        <TableCell className="px-4 font-medium">{f.mode}</TableCell>
                        <TableCell className="px-4">{f.count}</TableCell>
                        <TableCell className="px-4 font-semibold">{inr(f.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ================= INVENTORY ================= */}
          <TabsContent value="inventory" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<Boxes size={20} />} label="Stock value" value={inr(KPIS.inventoryValue)} trend={2} tone="indigo" />
              <PremiumStatCard icon={<Package size={20} />} label="Low-stock items" value={LOW_STOCK.length} trend={-1} tone="rose" />
              <PremiumStatCard icon={<Building2 size={20} />} label="Warehouses" value={2} tone="sky" />
              <PremiumStatCard icon={<Receipt size={20} />} label="Material issued" value={12} trend={6} tone="emerald" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={box}>
                <SectionHeader title="Stock by category" subtitle="Current valuation" icon={<Boxes size={16} />} />
                <div className="space-y-3">
                  {STOCK_SUMMARY.map((s) => <ProgressRow key={s.label} label={s.label} value={s.value} total={STOCK_SUMMARY[0].value} tone="indigo" suffix={inr(s.value)} />)}
                </div>
              </div>
              <div className={`${box} p-0`}>
                <div className="p-5 pb-3"><SectionHeader title="Low stock alerts" subtitle="Reorder soon" icon={<AlertTriangle size={16} />} /></div>
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>{["Item", "Available", "Min"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {LOW_STOCK.map((l) => (
                      <TableRow key={l.item}>
                        <TableCell className="px-4 font-medium">{l.item}</TableCell>
                        <TableCell className="px-4 text-rose-600 font-semibold">{l.available}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">{l.min}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ================= CUSTOMERS ================= */}
          <TabsContent value="customers" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<Users size={20} />} label="Total customers" value={48} trend={5} tone="indigo" />
              <PremiumStatCard icon={<Plus size={20} />} label="New this month" value={7} trend={12} tone="emerald" />
              <PremiumStatCard icon={<CheckCircle2 size={20} />} label="Repeat customers" value={12} trend={4} tone="sky" />
              <PremiumStatCard icon={<CircleDollarSign size={20} />} label="Total outstanding" value={inr(KPIS.outstanding)} trend={-6} tone="rose" />
            </div>
            <div className={`${box} mt-4 p-0`}>
              <div className="p-5 pb-3"><SectionHeader title="Top customers by revenue" subtitle="Your highest-value accounts" icon={<Users size={16} />} /></div>
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>{["Customer", "Projects", "Revenue", "Outstanding"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Hotel Taj View", projects: 2, revenue: 640000, out: 120000 },
                    { name: "Meena Traders", projects: 1, revenue: 480000, out: 60000 },
                    { name: "Anil Gupta", projects: 1, revenue: 320000, out: 0 },
                    { name: "Rekha Devi", projects: 1, revenue: 220000, out: 40000 },
                  ].map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5"><Avatar name={c.name} /><span className="font-medium">{c.name}</span></div>
                      </TableCell>
                      <TableCell className="px-4">{c.projects}</TableCell>
                      <TableCell className="px-4 font-semibold">{inr(c.revenue)}</TableCell>
                      <TableCell className="px-4">
                        {c.out ? <span className="font-medium text-amber-700">{inr(c.out)}</span> : <span className="text-emerald-700">Paid</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ================= HR ================= */}
          <TabsContent value="hr" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<Users size={20} />} label="Attendance" value={`${HR_STATS.attendance}%`} trend={2} tone="emerald" />
              <PremiumStatCard icon={<CalendarClock size={20} />} label="On leave today" value={HR_STATS.leavesToday} tone="amber" />
              <PremiumStatCard icon={<ClipboardCheck size={20} />} label="Pending tasks" value={HR_STATS.pendingTasks} trend={-8} tone="rose" />
              <PremiumStatCard icon={<Target size={20} />} label="Top performer" value={HR_STATS.topPerformer} tone="indigo" />
            </div>
            <div className={`${box} mt-4 overflow-hidden p-0`}>
              <div className="p-5 pb-3"><SectionHeader title="Team performance" subtitle="Leads, revenue, on-time tasks" icon={<Users size={16} />} /></div>
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>{["Employee", "Leads", "Surveys", "Quotes", "Won", "Revenue", "On-time"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {TEAM_PERF.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={t.name} /><span className="font-semibold">{t.name}</span></div></TableCell>
                      <TableCell className="px-4">{t.leads}</TableCell>
                      <TableCell className="px-4">{t.surveys}</TableCell>
                      <TableCell className="px-4">{t.quotes}</TableCell>
                      <TableCell className="px-4">{t.won}</TableCell>
                      <TableCell className="px-4 font-semibold">{inr(t.revenue)}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-slate-100">
                            <div className={`h-2 rounded-full ${t.ontime < 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${t.ontime}%` }} />
                          </div>
                          <span className="text-sm">{t.ontime}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ================= SERVICE & AMC ================= */}
          <TabsContent value="service" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<AlertTriangle size={20} />} label="Open complaints" value={SERVICE_STATS.openComplaints} trend={-4} tone="rose" />
              <PremiumStatCard icon={<CheckCircle2 size={20} />} label="Resolved this month" value={SERVICE_STATS.resolvedThisMonth} trend={10} tone="emerald" />
              <PremiumStatCard icon={<Wrench size={20} />} label="AMC renewals due" value={SERVICE_STATS.amcRenewalsDue} trend={2} tone="amber" />
              <PremiumStatCard icon={<ClipboardCheck size={20} />} label="Warranty expiring" value={SERVICE_STATS.warrantyExpiring} tone="indigo" />
            </div>
            <div className={`${box} mt-4`}>
              <SectionHeader title="Service & AMC pipeline" subtitle="What needs action this month" icon={<Wrench size={16} />} />
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600" /> 5 open complaints, 2 pending beyond 7 days.</li>
                <li className="flex items-center gap-2"><Wrench size={14} className="text-indigo-600" /> 3 AMC contracts renew this month.</li>
                <li className="flex items-center gap-2"><ClipboardCheck size={14} className="text-rose-600" /> 2 warranties expire within 30 days.</li>
              </ul>
            </div>
          </TabsContent>

          {/* ================= IVR ================= */}
          <TabsContent value="ivr" className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumStatCard icon={<PhoneCall size={20} />} label="Incoming calls" value={IVR_STATS.incoming} trend={8} tone="indigo" />
              <PremiumStatCard icon={<Headphones size={20} />} label="Answered" value={IVR_STATS.answered} trend={5} tone="emerald" />
              <PremiumStatCard icon={<AlertTriangle size={20} />} label="Missed" value={IVR_STATS.missed} trend={-3} tone="rose" />
              <PremiumStatCard icon={<Target size={20} />} label="Converted leads" value={IVR_STATS.convertedLeads} trend={6} tone="sky" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className={box}>
                <SectionHeader title="Call answer rate" subtitle="Answered vs missed" icon={<Headphones size={16} />} />
                <div className="space-y-3">
                  <ProgressRow label="Answered" value={IVR_STATS.answered} total={IVR_STATS.incoming} tone="green" suffix={`${IVR_STATS.answered} / ${IVR_STATS.incoming}`} />
                  <ProgressRow label="Missed" value={IVR_STATS.missed} total={IVR_STATS.incoming} tone="red" suffix={`${IVR_STATS.missed} / ${IVR_STATS.incoming}`} />
                  <ProgressRow label="Missed → followed up" value={IVR_STATS.missedFollowed} total={IVR_STATS.missed} tone="indigo" suffix={`${IVR_STATS.missedFollowed} / ${IVR_STATS.missed}`} />
                </div>
              </div>
              <div className={box}>
                <SectionHeader title="Lead conversion from calls" subtitle="Converted leads vs total incoming" icon={<Target size={16} />} />
                <div className="space-y-3">
                  <ProgressRow label="Calls converted to lead" value={IVR_STATS.convertedLeads} total={IVR_STATS.incoming} tone="indigo" suffix={`${IVR_STATS.convertedLeads} / ${IVR_STATS.incoming}`} />
                </div>
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  3 missed calls are still not followed up.{" "}
                  <a href="/ivr?filter=missed" className="font-semibold underline-offset-2 hover:underline">Open IVR log →</a>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Panel>

      <MisReportModal open={misOpen} onClose={() => setMisOpen(false)} />
    </div>
  );
}