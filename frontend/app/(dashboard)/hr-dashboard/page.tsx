"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Banknote,
  Cake,
  CalendarDays,
  CalendarOff,
  Check,
  ChevronRight,
  FileWarning,
  HardHat,
  Hourglass,
  MapPin,
  Plus,
  Timer,
  UserCheck,
  UserPlus,
  Users,
  X,
  ClipboardCheck,
} from "lucide-react";
import { Avatar, Btn, Card, Chip, PageHeader, Progress, SectionTitle, StatCard, StatGrid, type Tone } from "@/components/erp/erp-ui";

/* ---------- sample data (replace with API) ---------- */

const total = 48;
const attendance = [
  { label: "On time", value: 36, bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { label: "Late", value: 5, bar: "bg-amber-400", dot: "bg-amber-400" },
  { label: "On leave", value: 4, bar: "bg-sky-400", dot: "bg-sky-400" },
  { label: "Absent", value: 3, bar: "bg-red-400", dot: "bg-red-400" },
];
const present = attendance[0].value + attendance[1].value;
const onSite = 18;

// Last 7 days, oldest first. Sundays are shown as "Off".
const trendValues = [91, 94, 88, 92, 90, 93]; // working days only
const trendDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return d;
});

const departments = [
  { name: "Installation team", count: 22 },
  { name: "Sales", count: 12 },
  { name: "Service & support", count: 5 },
  { name: "Accounts", count: 4 },
  { name: "Management", count: 3 },
  { name: "HR", count: 2 },
];

type Approval = { id: string; name: string; type: "Leave" | "Advance" | "Regularization"; detail: string };
const approvals: Approval[] = [
  { id: "a1", name: "Ramesh Kumar", type: "Leave", detail: "Casual leave · 22 to 23 Oct (2 days)" },
  { id: "a2", name: "Priya Mehta", type: "Leave", detail: "Sick leave · 21 Oct (1 day)" },
  { id: "a3", name: "Deepak Yadav", type: "Advance", detail: "Salary advance · ₹10,000" },
  { id: "a4", name: "Suresh Pal", type: "Regularization", detail: "Missed check-out on 17 Oct" },
  { id: "a5", name: "Kavita Rao", type: "Leave", detail: "Earned leave · 26 to 28 Oct (3 days)" },
];
const typeTone: Record<Approval["type"], Tone> = { Leave: "sky", Advance: "amber", Regularization: "slate" };

const payrollSteps = ["Attendance locked", "Salary calculated", "Approved", "Paid"];
const payrollStep = 1; // index of the current step

const attention: { title: string; note: string; value: number; href: string; icon: LucideIcon; color: string }[] = [
  { title: "Employee documents missing", note: "KYC, bank details, offer letters", value: 6, href: "/documents", icon: FileWarning, color: "bg-amber-50 text-amber-600" },
  { title: "Safety certificates expiring", note: "Within the next 30 days", value: 2, href: "/documents", icon: HardHat, color: "bg-red-50 text-red-600" },
  { title: "Probation ending this month", note: "Confirm or extend", value: 3, href: "/hr/employees", icon: Hourglass, color: "bg-indigo-50 text-indigo-600" },
  { title: "Advances to recover", note: "Deduct in this payroll", value: 4, href: "/hr/advances", icon: Banknote, color: "bg-emerald-50 text-emerald-600" },
];

const upcoming: { title: string; note: string; icon: LucideIcon; color: string }[] = [
  { title: "Priya Mehta's birthday", note: "22 Oct", icon: Cake, color: "bg-pink-50 text-pink-600" },
  { title: "Deepak Yadav, 2 years", note: "25 Oct · Work anniversary", icon: Award, color: "bg-amber-50 text-amber-600" },
  { title: "Site safety training", note: "28 Oct · 12 installers", icon: HardHat, color: "bg-indigo-50 text-indigo-600" },
  { title: "Diwali holiday", note: "8 Nov · Office closed", icon: CalendarDays, color: "bg-emerald-50 text-emerald-600" },
];

const joiners = [
  { name: "Vijay Singh", role: "Installer", joined: "14 Oct", docs: "3 of 6 docs", tone: "amber" as Tone },
  { name: "Neeraj Tomar", role: "Sales executive", joined: "10 Oct", docs: "5 of 5 docs", tone: "emerald" as Tone },
  { name: "Imran Khan", role: "Installer", joined: "3 Oct", docs: "6 of 6 docs", tone: "emerald" as Tone },
];

const linkBase =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

/* ---------- page ---------- */

export default function HrDashboardPage() {
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected">>({});
  const pending = approvals.filter((a) => !decisions[a.id]).length;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const payroll = { gross: 1482000, deductions: 164500 };
  const net = payroll.gross - payroll.deductions;
  const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

  // map trend values to the last 7 days, skipping Sundays
  let t = 0;
  const trend = trendDays.map((d) => {
    const off = d.getDay() === 0;
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), pct: off ? null : trendValues[t++ % trendValues.length], isToday: d === trendDays[6] };
  });

  return (
    <div className="min-w-0 !space-y-2">
      <PageHeader eyebrow={today} title="HR dashboard" desc="People, attendance and payroll at a glance."
        actions={
        <>
          <Link href="/hr/employees" className={`${linkBase} bg-slate-950 font-semibold text-white hover:bg-slate-800`}>
            <Plus size={16} /> Add employee
          </Link>
          <Link href="/hr/attendance" className={`${linkBase} border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50`}>
            <ClipboardCheck size={16} /> Mark attendance
          </Link>
          <Link href="/hr/payroll" className={`${linkBase} border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50`}>
            <Banknote size={16} /> Run payroll
          </Link>
        </>
      } />

      {/* Stat cards */}
      <StatGrid>
        <StatCard dark label="Total employees" value={String(total)} sub="3 joined this month" icon={Users} />
        <StatCard label="Present today" value={`${present} of ${total}`} sub={`${Math.round((present / total) * 100)}% attendance`} icon={UserCheck} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="On leave today" value="4" sub="2 sick, 2 casual" icon={CalendarOff} tint="bg-sky-50 text-sky-600" />
        <StatCard label="October payroll" value={inr(net)} sub="Net pay, waiting for approval" icon={Banknote} tint="bg-amber-50 text-amber-600" />
      </StatGrid>

      {/* Attendance + approvals */}
      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <SectionTitle
            title="Today's attendance"
            sub="How the team checked in this morning"
            action={
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tight text-slate-900">{Math.round((present / total) * 100)}%</p>
                <p className="text-xs text-slate-500">present</p>
              </div>
            }
          />

          <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {attendance.map((a) => (
              <div key={a.label} className={a.bar} style={{ width: `${(a.value / total) * 100}%` }} title={`${a.label}: ${a.value}`} />
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {attendance.map((a) => (
              <div key={a.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                  {a.label}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{a.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={15} className="text-indigo-600" />
            <span>
              <span className="font-semibold text-slate-900">{onSite}</span> employees checked in from site locations
            </span>
          </div>

          <div className="mt-2 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-900">Last 7 days</p>
            <div className="mt-4 flex h-32 items-end gap-3 sm:gap-5">
              {trend.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <span className="mb-1.5 text-center text-xs font-medium text-slate-500">{d.pct === null ? "Off" : `${d.pct}%`}</span>
                  <div
                    className={`w-full rounded-t-lg ${d.pct === null ? "bg-slate-100" : i === 6 ? "bg-indigo-600" : "bg-indigo-200"}`}
                    style={{ height: d.pct === null ? "6%" : `${((d.pct - 70) / 30) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 sm:gap-5">
              {trend.map((d, i) => (
                <span key={i} className={`flex-1 text-center text-xs ${i === 6 ? "font-semibold text-indigo-700" : "text-slate-500"}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle
            title="Pending approvals"
            sub={pending === 0 ? "All caught up" : `${pending} waiting for you`}
            action={<Link href="/hr/leave" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</Link>}
          />
          <ul className="mt-4 divide-y divide-slate-100">
            {approvals.map((a) => {
              const decision = decisions[a.id];
              return (
                <li key={a.id} className={`py-3.5 ${decision ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Avatar name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{a.name}</p>
                        <Chip tone={typeTone[a.type]}>{a.type}</Chip>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{a.detail}</p>
                      {decision ? (
                        <p className={`mt-2 text-xs font-semibold ${decision === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                          {decision === "approved" ? "Approved" : "Rejected"}
                        </p>
                      ) : (
                        <div className="mt-2.5 flex gap-1.5">
                          <Btn size="sm" variant="primary" icon={Check} onClick={() => setDecisions((d) => ({ ...d, [a.id]: "approved" }))}>
                            Approve
                          </Btn>
                          <Btn size="sm" icon={X} onClick={() => setDecisions((d) => ({ ...d, [a.id]: "rejected" }))}>
                            Reject
                          </Btn>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Payroll + attention */}
      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <SectionTitle
            title="Payroll for October"
            sub="Salary cycle status"
            action={
              <Link href="/hr/payroll" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Review payroll <ChevronRight size={15} />
              </Link>
            }
          />

          {/* stepper */}
          <ol className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {payrollSteps.map((s, i) => {
              const done = i < payrollStep;
              const current = i === payrollStep;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-emerald-500 text-white" : current ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <Check size={15} /> : i + 1}
                  </span>
                  <span className={`text-sm ${current ? "font-semibold text-slate-900" : done ? "font-medium text-slate-700" : "text-slate-400"}`}>{s}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-500">Gross salary</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{inr(payroll.gross)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-500">Deductions</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{inr(payroll.deductions)}</p>
              <p className="mt-0.5 text-xs text-slate-400">PF, ESI, advances</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <p className="text-xs font-medium text-indigo-700">Net payable</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-indigo-700">{inr(net)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Timer size={14} className="text-slate-400" />
            Pay salaries by the 7th. Deposit PF and ESI by the 15th of next month.
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Needs attention" sub="Check these first" />
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
                  <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Headcount + upcoming + joiners */}
      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4">
          <SectionTitle title="Team by department" sub={`${total} employees in total`} />
          <div className="mt-5 space-y-4">
            {departments.map((d) => (
              <div key={d.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <span className="tabular-nums text-slate-500">
                    {d.count}
                    <span className="ml-1.5 text-xs text-slate-400">{Math.round((d.count / total) * 100)}%</span>
                  </span>
                </div>
                <Progress value={(d.count / departments[0].count) * 100} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Coming up" sub="Next two weeks" />
          <ul className="mt-4 space-y-4">
            {upcoming.map((u) => {
              const Icon = u.icon;
              return (
                <li key={u.title} className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${u.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{u.title}</p>
                    <p className="text-xs text-slate-500">{u.note}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-4">
          <SectionTitle
            title="New joiners"
            sub="Joined in the last 30 days"
            action={
              <Link href="/hr/employees" aria-label="Add employee" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <UserPlus size={16} />
              </Link>
            }
          />
          <ul className="mt-2 space-y-4">
            {joiners.map((j) => (
              <li key={j.name} className="flex items-center gap-3">
                <Avatar name={j.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{j.name}</p>
                  <p className="text-xs text-slate-500">
                    {j.role} · Joined {j.joined}
                  </p>
                </div>
                <Chip tone={j.tone}>{j.docs}</Chip>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-slate-100 pt-4 text-xs text-slate-400">Sample data. Connect the API to show live records.</p>
        </Card>
      </section>
    </div>
  );
}
