"use client";

import { PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField } from "@/components/ui/page-layout";

import { useState } from "react";
import { BellRing, Check, Settings2, Target, TrendingUp, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const COLS: { stage: string; tone: Tone }[] = [
  { stage: "New", tone: "slate" }, { stage: "Contacted", tone: "indigo" }, { stage: "Site visit", tone: "amber" },
  { stage: "Quoted", tone: "indigo" }, { stage: "Won", tone: "green" },
];
const ALL_STAGES = [...COLS.map((c) => c.stage), "Lost"];
const LOST_REASONS = ["Price too high", "Chose competitor", "No roof space", "Not interested now", "Loan rejected"];
const BASE_LOST: Record<string, number> = { "Price too high": 8, "Chose competitor": 6, "No roof space": 4, "Not interested now": 2, "Loan rejected": 3 };

type Deal = { id: number; name: string; meta: string; stage: string; lostReason: string };
const SEED: Deal[] = [
  { id: 1, name: "Pooja Singh", meta: "3 kW · Firozabad", stage: "New", lostReason: "" },
  { id: 2, name: "Ravi Mishra", meta: "5 kW · Kamla Nagar", stage: "New", lostReason: "" },
  { id: 3, name: "Sunil Yadav", meta: "5 kW · Mathura Road", stage: "Contacted", lostReason: "" },
  { id: 4, name: "Anil Gupta", meta: "5 kW · Sanjay Place", stage: "Site visit", lostReason: "" },
  { id: 5, name: "Meena Traders", meta: "10 kW · Kamla Nagar", stage: "Quoted", lostReason: "" },
  { id: 6, name: "Rekha Devi", meta: "3 kW · Dayalbagh", stage: "Quoted", lostReason: "" },
  { id: 7, name: "Vikas Jain", meta: "5 kW · Shahganj", stage: "Won", lostReason: "" },
];
const REM = [
  { id: 1, time: "4:00 PM", name: "Anil Gupta", note: "Site visit", by: "Rohit Sharma", late: false },
  { id: 2, time: "6:30 PM", name: "Meena Traders", note: "Share revised quotation", by: "Neha Verma", late: false },
  { id: 3, time: "Overdue", name: "Sunil Yadav", note: "Call back about subsidy", by: "Rohit Sharma", late: true },
];
const RULES = [
  "Remind the employee 1 hour before a follow-up",
  "Flag a lead as overdue after 24 hours",
  "Move lead to Quoted when a quotation is sent",
  "Ask for a lost reason when a lead is marked Lost",
];

export default function SalesAutomationPage() {
  const [deals, setDeals] = useState<Deal[]>(SEED);
  const [done, setDone] = useState<number[]>([]);
  const [deal, setDeal] = useState<Deal>(SEED[0]);
  const [dealOpen, setDealOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [on, setOn] = useState<boolean[]>([true, true, true, true]);

  const lostCounts = { ...BASE_LOST };
  deals.forEach((x) => x.stage === "Lost" && x.lostReason && (lostCounts[x.lostReason] += 1));
  const lost = Object.entries(lostCounts).sort((a, b) => b[1] - a[1]);
  const max = lost[0][1];
  const openDeals = deals.filter((x) => !["Won", "Lost"].includes(x.stage)).length;
  const won = deals.filter((x) => x.stage === "Won").length;
  const invalid = deal.stage === "Lost" && !deal.lostReason;

  const save = () => {
    if (invalid) return;
    setDeals((p) => p.map((x) => (x.id === deal.id ? deal : x)));
    setDealOpen(false);
  };

  return (
    <div className="space-y-2">
      <PageHeader title="Sales automation" subtitle="Pipeline stages, follow-up reminders and lost-lead reasons.">
        <Button size="lg" className="h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800" onClick={() => setRulesOpen(true)}><Settings2 /> Reminder rules</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Workflow size={24} />} value={openDeals} label="Open deals" />
        <StatCard icon={<BellRing size={24} />} value={REM.length - done.length} label="Reminders pending" />
        <StatCard icon={<Target size={24} />} value={`${Math.round((won / deals.length) * 100)}%`} label="Win rate" />
      </div>

      <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5">
        {COLS.map((c) => {
          const items = deals.filter((x) => x.stage === c.stage);
          return (
            <div key={c.stage} className="min-w-[210px] rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <StatusBadge tone={c.tone}>{c.stage}</StatusBadge>
                <span className="text-sm font-semibold text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2.5">
                {items.map((x) => (
                  <button key={x.id} onClick={() => { setDeal({ ...x }); setDealOpen(true); }} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                    <p className="font-semibold">{x.name}</p>
                    <p className="text-sm text-muted-foreground">{x.meta}</p>
                  </button>
                ))}
                {items.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">No leads</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="p-4">
          <h2 className="text-base font-bold">Follow-up reminders</h2>
          <p className="mb-2 text-sm text-muted-foreground">Due today</p>
          <ul>
            {REM.map((r) => {
              const isDone = done.includes(r.id);
              return (
                <li key={r.id} className="flex items-center gap-4 border-t py-3.5">
                  <span className={`w-16 text-sm font-semibold ${r.late && !isDone ? "text-red-600" : "text-muted-foreground"}`}>{r.time}</span>
                  <div className={`flex-1 ${isDone ? "opacity-50" : ""}`}>
                    <p className={`font-semibold ${isDone ? "line-through" : ""}`}>{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.note} · {r.by}</p>
                  </div>
                  <Button variant="outline" size="sm" className={isDone ? "bg-emerald-50 text-emerald-700" : ""} onClick={() => setDone((p) => (isDone ? p.filter((i) => i !== r.id) : [...p, r.id]))}>
                    <Check /> {isDone ? "Done" : "Mark done"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><TrendingUp size={20} /></span>
            <div><h2 className="text-base font-bold">Why leads were lost</h2><p className="text-sm text-muted-foreground">Last 30 days</p></div>
          </div>
          <div className="space-y-4">
            {lost.map(([reason, n], i) => (
              <div key={reason}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{reason}</span><span className="font-bold">{n}</span></div>
                <div className="h-2.5 rounded-full bg-muted"><div className={`h-full rounded-full ${i === 0 ? "bg-indigo-600" : "bg-indigo-200"}`} style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Move stage / mark lost → Dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="text-xl font-bold">{deal.name}</DialogTitle>
            <DialogDescription>{deal.meta}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1">
            <SelectField label="Pipeline stage" value={deal.stage} onChange={(v) => setDeal({ ...deal, stage: v })} options={ALL_STAGES} />
            {deal.stage === "Lost" && <SelectField label="Lost reason" value={deal.lostReason} onChange={(v) => setDeal({ ...deal, lostReason: v })} options={LOST_REASONS} placeholder="Select a reason" />}
          </div>
          <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-end">
            <Button variant="outline" size="lg" className="h-10 rounded-xl border-slate-200 px-4" onClick={() => setDealOpen(false)}>Cancel</Button>
            <Button size="lg" className="h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800" disabled={invalid} onClick={save}>Update stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder rules → Sheet */}
      <Sheet open={rulesOpen} onOpenChange={setRulesOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 !max-w-2xl">
          <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left">
            <SheetTitle className="text-xl font-bold">Reminder rules</SheetTitle>
            <SheetDescription>Choose what happens automatically.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-3">
              {RULES.map((r, i) => (
                <li key={r} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3.5">
                  <Label htmlFor={`rule-${i}`} className="font-semibold leading-snug text-slate-800">{r}</Label>
                  <Switch id={`rule-${i}`} checked={on[i]} onCheckedChange={(v) => setOn((p) => p.map((x, j) => (j === i ? v : x)))} />
                </li>
              ))}
            </ul>
          </div>
          <SheetFooter className="flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-10 flex-1 rounded-xl border-slate-200 px-4 sm:flex-none" onClick={() => setRulesOpen(false)}>Cancel</Button>
              <Button size="lg" className="h-10 flex-1 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800 sm:flex-none" onClick={() => setRulesOpen(false)}>Save rules</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}










