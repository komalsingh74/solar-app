"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, CalendarCheck,
  Check, CheckCircle2, ChevronRight, Circle, ClipboardCheck, FileText, Headset,
  HardHat, RotateCcw, Route, ShoppingCart, Sun, UsersRound, Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/ui/page-layout";
import { showInfo, showSuccess } from "@/lib/toast";

const STORAGE_KEY = "vanshika-demo-customer-journey-v1";
const steps = [
  { title: "Create lead", group: "CRM", icon: UsersRound, description: "Capture Anil Gupta and assign Rohit Sharma.", detail: "Referral · Residential · 5 kW · Sanjay Place, Agra", href: "/leads" },
  { title: "Schedule follow-up", group: "Tasks", icon: CalendarCheck, description: "Add Rohit's high-priority call and keep it linked to the lead.", detail: "26 Oct 2026 · 11:00 AM · Confirm bill and roof access", href: "/follow-ups-my-task" },
  { title: "Complete site survey", group: "Survey", icon: ClipboardCheck, description: "Record site and electrical details; recommendation remains illustrative.", detail: "RCC · 800 sq. ft. shadow-free · 5 kW sanctioned load pending verification", href: "/site-survey" },
  { title: "Accept quotation", group: "Sales", icon: FileText, description: "Prepare and accept the itemized 5 kW quotation.", detail: "₹2,00,000 subtotal + ₹14,000 taxable charges + ₹36,000 GST = ₹2,50,000", href: "/quotations" },
  { title: "Convert to project", group: "Project", icon: Sun, description: "Associate the existing lead/customer with the accepted project.", detail: "VSS-2026-001 · 5 kW · Rohit Sharma + Installation Team", href: "/projects" },
  { title: "Receive & issue materials", group: "Inventory", icon: Warehouse, description: "Receive the purchase and issue project materials without negative stock.", detail: "Solar Supply Co. · Main Warehouse · 20 panels received, 9 issued, 11 balance", href: "/inventory-stock" },
  { title: "Install & hand over", group: "Operations + HRMS", icon: HardHat, description: "Progress installation milestones and confirm customer handover.", detail: "Planning → Material Ready → Installation → Inspection / Handover → Completed", href: "/installation-team" },
  { title: "Record invoice & payments", group: "Finance", icon: Banknote, description: "Link the contract invoice to the project and record collections.", detail: "₹2,50,000 invoice · ₹50,000 advance + ₹1,50,000 installation payment · ₹50,000 outstanding", href: "/invoices" },
  { title: "Resolve service complaint", group: "Service", icon: Headset, description: "Track the post-handover monitoring issue through resolution.", detail: "Inverter monitoring offline · Medium · Rohit Sharma · Open → Resolved", href: "/service" },
];
const formatINR = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function CustomerJourneyPage() {
  const [completed, setCompleted] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved)) setCompleted(Math.max(0, Math.min(steps.length, saved)));
    } catch { /* Demo still works for this session when storage is unavailable. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, String(completed)); } catch { /* Keep in-memory demo state. */ }
  }, [completed, hydrated]);

  const status = useMemo(() => completed === steps.length ? "Complete" : completed === 0 ? "Ready to start" : `${completed} of ${steps.length} steps`, [completed]);
  const advance = () => {
    if (completed >= steps.length) return;
    const next = completed + 1;
    setCompleted(next);
    showSuccess(`${steps[next - 1].title} marked complete. Journey progress saved in this browser.`);
  };
  const reset = () => {
    setCompleted(0);
    showInfo("Customer journey demo reset to its starting point.");
  };

  return (
    <div className="!space-y-4">
      <PageHeader title="Customer journey demo" subtitle="Follow one sample customer from first lead through installation, payment and after-sales service.">
        <Button variant="outline" className="rounded-xl" onClick={reset}><RotateCcw size={16} /> Reset journey</Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UsersRound size={22} />} value="Anil Gupta" label="Residential · Agra" />
        <StatCard icon={<Sun size={22} />} value="5 kW" label="Proposed rooftop system" />
        <StatCard icon={<BriefcaseBusiness size={22} />} value={formatINR(250000)} label="Illustrative contract value" />
        <StatCard icon={<BadgeCheck size={22} />} value={status} label="Journey progress" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900">Anil Gupta</h2><StatusBadge tone="indigo">Frontend demo data</StatusBadge></div>
            <p className="mt-1 text-sm text-slate-500">Sanjay Place, Agra · Residential rooftop · Monthly bill {formatINR(5000)}</p>
            <p className="mt-2 text-xs text-slate-400">Demo records are stored in this browser. They are not sent to the server.</p>
          </div>
          <div className="w-full max-w-xs"><div className="mb-2 flex justify-between text-xs font-medium text-slate-500"><span>Journey progress</span><span>{Math.round((completed / steps.length) * 100)}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} /></div></div>
        </div>

        <ol className="divide-y divide-slate-100">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const done = index < completed;
            const current = index === completed && completed < steps.length;
            return (
              <li key={step.title} className={`relative p-4 sm:p-5 ${current ? "bg-indigo-50/40" : ""}`}>
                <div className="flex gap-3 sm:gap-4">
                  <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? "bg-emerald-100 text-emerald-700" : current ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>
                    {done ? <Check size={18} /> : <Icon size={18} />}
                    {index < steps.length - 1 && <span className="absolute left-1/2 top-11 h-[calc(100%+1.5rem)] w-px -translate-x-1/2 bg-slate-200 sm:h-[calc(100%+2rem)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{step.group}</span>{done ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={12} /> Complete</span> : current ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Next step</span> : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={11} /> Upcoming</span>}</div>
                    <h3 className="mt-1 font-semibold text-slate-900">{index + 1}. {step.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                    <p className="mt-2 text-sm text-slate-500">{step.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={step.href} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open module <ChevronRight size={14} /></Link>
                      {current && <Button size="sm" className="rounded-lg" onClick={advance}>Complete step <ArrowRight size={14} /></Button>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500"><ArrowDown size={14} /> Every stage in this walkthrough uses the same Anil Gupta demo scenario.</div>
      </Panel>

      <Panel className="p-5">
        <h2 className="font-semibold text-slate-900">Complete software workflow</h2>
        <p className="mt-1 text-sm text-slate-500">The connected business flow spans four teams.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {[
            { title: "CRM — Lead to Sale", items: "Lead → Follow-up → Site Survey → Quotation → Customer Confirmation", color: "border-indigo-200 bg-indigo-50/70 text-indigo-700", icon: UsersRound },
            { title: "ERP — Sale to Installation", items: "Solar Project → Purchase → Warehouse Stock → Installation → Invoice → Payment", color: "border-emerald-200 bg-emerald-50/70 text-emerald-700", icon: ShoppingCart },
            { title: "HRMS — Employee Management", items: "Employee → Attendance → Leave → Team Assignment → Payroll-ready Records", color: "border-orange-200 bg-orange-50/70 text-orange-700", icon: HardHat },
            { title: "Service & Management", items: "Complaint → Service Visit → Resolution → Reports & Outstanding", color: "border-violet-200 bg-violet-50/70 text-violet-700", icon: Headset },
          ].map(({ title, items, color, icon: Icon }, index) => <div key={title} className="relative rounded-xl border p-4 text-center lg:min-h-36"><div className={`mx-auto grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon size={18} /></div><h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{items}</p>{index < 3 && <ArrowRight size={16} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-400 lg:block" />}</div>)}
        </div>
        <p className="mt-4 text-xs text-slate-400">Subsidy estimate ₹78,000 is illustrative only. Eligibility and the final amount depend on the applicable scheme, capacity and approval.</p>
      </Panel>
    </div>
  );
}
