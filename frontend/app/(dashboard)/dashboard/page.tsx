import Link from "next/link";
import {
  Plus,
  FileText,
  Wallet,
  ChartNoAxesCombined,
  Sun,
  Zap,
  Banknote,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Clock3,
  Headset,
  Landmark,
  Phone,
  MapPin,
  Target,
  PackageX,
  CircleCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardWelcome from "./dashboard-welcome";
import { projects, projectStages } from "@/lib/mock-data";

export const instant = false;

/* ---------- Data (replace with API later) ---------- */

const quickActions = [
  { label: "Add lead", href: "/leads", icon: Plus, primary: true },
  { label: "Create quotation", href: "/quotations", icon: FileText },
  { label: "Add payment", href: "/payment-outstanding", icon: Wallet },
  { label: "View reports", href: "/reports", icon: ChartNoAxesCombined },
];

const stats = [
  {
    label: "Total sales",
    value: "₹18,40,000",
    sub: "This month",
    change: "+14.2%",
    up: true,
    icon: Sun,
    spark: [8, 11, 9, 14, 13, 17, 20],
    tint: "bg-amber-50 text-amber-600",
    stroke: "#d97706",
  },
  {
    label: "Active projects",
    value: "23",
    sub: "48 kW under installation",
    change: "+8.0%",
    up: true,
    icon: Zap,
    spark: [14, 15, 15, 18, 19, 21, 23],
    tint: "bg-indigo-50 text-indigo-600",
    stroke: "#4f46e5",
  },
  {
    label: "Pending payments",
    value: "₹4,35,000",
    sub: "From 9 customers",
    change: "-6.5%",
    up: false,
    icon: Banknote,
    spark: [9, 8, 10, 7, 8, 6, 5],
    tint: "bg-amber-50 text-amber-600",
    stroke: "#d97706",
  },
  {
    label: "Lead conversion",
    value: "24.8%",
    sub: "136 leads this month",
    change: "+4.6%",
    up: true,
    icon: TrendingUp,
    spark: [18, 19, 21, 20, 22, 23, 25],
    tint: "bg-emerald-50 text-emerald-600",
    stroke: "#059669",
  },
];

const weekly = [
  { day: "Mon", kw: 14 },
  { day: "Tue", kw: 22 },
  { day: "Wed", kw: 18 },
  { day: "Thu", kw: 26 },
  { day: "Fri", kw: 16 },
  { day: "Sat", kw: 8 },
  { day: "Sun", kw: 0 },
];
const TODAY_INDEX = 5; // Sat
const DAILY_TARGET = 20;
const CHART_MAX = 30;

const attention = [
  { title: "Quotations awaiting reply", note: "Sent more than 3 days ago", value: 7, href: "/quotations", icon: FileText, color: "bg-amber-50 text-amber-600" },
  { title: "Overdue payments", note: "Past due date", value: 4, href: "/payments", icon: Wallet, color: "bg-red-50 text-red-600" },
  { title: "Subsidy pending", note: "Waiting on DISCOM / portal", value: 6, href: "/projects", icon: Landmark, color: "bg-indigo-50 text-indigo-600" },
  { title: "Open support tickets", note: "Need a visit or call", value: 3, href: "/service", icon: Headset, color: "bg-emerald-50 text-emerald-600" },
  { title: "Low stock items", note: "Below reorder level", value: 2, href: "/inventory", icon: PackageX, color: "bg-slate-100 text-slate-600" },
];

const sourceStats = [
  { name: "Reference", count: 42, bar: "bg-indigo-600" },
  { name: "Telecalling", count: 35, bar: "bg-indigo-500" },
  { name: "Social media", count: 28, bar: "bg-indigo-400" },
  { name: "Freelancer", count: 19, bar: "bg-indigo-300" },
  { name: "Payroll team", count: 12, bar: "bg-indigo-200" },
];

const followUps = [
  { name: "Hotel Raj Palace", task: "Price negotiation call", time: "11:30 AM", owner: "Rohit", type: "call", done: true },
  { name: "St. Mary School", task: "Share revised quotation", time: "2:00 PM", owner: "Rohit", type: "call", done: false },
  { name: "Neha Gupta", task: "Site survey visit", time: "4:30 PM", owner: "Deepak", type: "visit", done: false },
];

/* ---------- Small helpers ---------- */

function Sparkline({ data, stroke, className }: { data: number[]; stroke: string; className?: string }) {
  const w = 96;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} fill="none" aria-hidden="true">
      <path d={area} fill={stroke} fillOpacity="0.12" />
      <path d={line} stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  const totalKw = weekly.reduce((sum, d) => sum + d.kw, 0);
  const daysCounted = TODAY_INDEX + 1;
  const avgKw = (totalKw / daysCounted).toFixed(1);
  const targetHitDays = weekly.slice(0, daysCounted).filter((d) => d.kw >= DAILY_TARGET).length;
  const sourceTotal = sourceStats.reduce((s, x) => s + x.count, 0);
  const maxSource = sourceStats[0].count;

  const stageCounts = projectStages.map((stage) => ({
    stage,
    count: projects.filter((p) => p.stage === stage).length,
  }));
  const totalProjects = stageCounts.reduce((s, x) => s + x.count, 0) || 1;
  const currentStage = 3;

  return (
    <div className="min-w-0 !space-y-2">
      <DashboardWelcome>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ label, href, icon: Icon, primary }) => (
            <Link
              key={label}
              href={href}
              className={
                primary
                  ? "inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                  : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </DashboardWelcome>

      {/* Stat cards */}
      <section className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex min-h-[96px] min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xl font-bold tracking-tight text-slate-900">{s.value}</p>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {s.change}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-400">{s.sub}</p>
                  <Sparkline data={s.spark} stroke={s.stroke!} className="h-7 w-20 shrink-0" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Chart + attention */}
      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <CardHeader
            title="Installations this week"
            subtitle={`kW installed per day. Daily target: ${DAILY_TARGET} kW.`}
            action={
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tight text-slate-900">{totalKw} kW</p>
                <p className="text-xs text-slate-500">installed so far</p>
              </div>
            }
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <Target size={13} className="text-indigo-600" /> Avg {avgKw} kW / day
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <CircleCheck size={13} className="text-emerald-600" /> Target met {targetHitDays} of {daysCounted} days
            </span>
          </div>

          <div className="relative mt-6 h-52">
            {/* target line */}
            <div
              className="absolute inset-x-0 z-10 border-t border-dashed border-slate-400/70"
              style={{ bottom: `${(DAILY_TARGET / CHART_MAX) * 100}%` }}
            >
              <span className="absolute -top-2.5 right-0 bg-white pl-2 text-[11px] font-medium text-slate-500">
                Target {DAILY_TARGET}
              </span>
            </div>

            <div className="relative flex h-full items-end gap-3 sm:gap-5">
              {weekly.map((d, i) => {
                const isToday = i === TODAY_INDEX;
                const future = i > TODAY_INDEX;
                const hit = !future && d.kw >= DAILY_TARGET;
                const barColor = isToday
                  ? "bg-indigo-600"
                  : future
                  ? "bg-slate-100"
                  : hit
                  ? "bg-indigo-400"
                  : "bg-indigo-200";
                return (
                  <div key={d.day} className="flex h-full flex-1 flex-col justify-end">
                    <span
                      className={`mb-1.5 text-center text-xs font-semibold ${
                        isToday ? "text-indigo-700" : "text-slate-500"
                      }`}
                    >
                      {future ? "" : d.kw}
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-colors ${barColor}`}
                      style={{ height: `${future ? 4 : Math.max((d.kw / CHART_MAX) * 100, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex gap-3 border-t border-slate-100 pt-3 sm:gap-5">
            {weekly.map((d, i) => (
              <span
                key={d.day}
                className={`flex-1 text-center text-xs ${
                  i === TODAY_INDEX ? "font-semibold text-indigo-700" : "text-slate-500"
                }`}
              >
                {d.day}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="Needs attention" subtitle="Check these first" />
          <div className="-mx-2 mt-3 divide-y divide-slate-100">
            {attention.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.title}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className={`rounded-xl p-2.5 ${a.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="truncate text-xs text-slate-500">{a.note}</p>
                  </div>
                  <span className="text-lg font-bold tabular-nums text-slate-900">{a.value}</span>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                  />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Pipeline */}
      <Card className="p-4">
        <CardHeader
          title="Project pipeline"
          subtitle="From site survey to handover"
          action={
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              View projects <ChevronRight size={15} />
            </Link>
          }
        />

        {/* proportional bar */}
        <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          {stageCounts.map((s, i) => (
            <div
              key={s.stage}
              className={i === currentStage ? "bg-indigo-600" : i < currentStage ? "bg-indigo-300" : "bg-slate-200"}
              style={{ width: `${(s.count / totalProjects) * 100}%` }}
              title={`${s.stage}: ${s.count}`}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stageCounts.map((s, i) => {
            const active = i === currentStage;
            return (
              <div
                key={s.stage}
                className={`rounded-xl border p-4 transition ${
                  active
                    ? "border-indigo-200 bg-indigo-50/70 ring-1 ring-indigo-100"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <p className={`text-2xl font-bold tabular-nums ${active ? "text-indigo-700" : "text-slate-900"}`}>
                  {s.count}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s.stage}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Lead sources + follow ups */}
      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4">
          <CardHeader
            title="Leads by source"
            subtitle="Where this month's leads came from"
            action={<span className="text-sm font-semibold text-slate-900">{sourceTotal}</span>}
          />
          <div className="mt-5 space-y-4">
            {sourceStats.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{s.name}</span>
                  <span className="tabular-nums text-slate-500">
                    {s.count}
                    <span className="ml-1.5 text-xs text-slate-400">
                      {Math.round((s.count / sourceTotal) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${s.bar}`}
                    style={{ width: `${(s.count / maxSource) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Today&apos;s follow-ups</h2>
              <p className="mt-0.5 text-sm text-slate-500">Calls and visits scheduled for your team</p>
            </div>
            <Badge tone="blue">{followUps.length} tasks</Badge>
          </div>

          <div className="divide-y divide-slate-100">
            {followUps.map((f) => {
              const TypeIcon = f.type === "visit" ? MapPin : Phone;
              return (
                <div
                  key={f.name}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/60 sm:px-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                    {f.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${f.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                      {f.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <TypeIcon size={12} className="shrink-0 text-slate-400" />
                      {f.task}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1 text-sm font-medium text-slate-700">
                      <Clock3 size={14} className="text-slate-400" /> {f.time}
                    </p>
                    <p className="text-xs text-slate-500">{f.owner}</p>
                  </div>

                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                      f.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {f.done ? "Done" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
            <span>Sample data. Connect the API to show live records.</span>
            <Link href="/follow-ups" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50">
              See all tasks
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
