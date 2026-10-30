"use client";

import { Avatar, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, fmtDate, dayLabel, inr, outBtn, thCls } from "@/components/master/module-kit";

import { useMemo, useState } from "react";
import { AlertCircle, Eye, IndianRupee, Landmark, MessageCircle, Plus, Search, Settings2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* =====================================================================
   Payments, Plans & Loan — ek hi page
   Flow: Set plan (advance / loan / baaki) → Record payment → Loan status track
   Loan amount "Received" me tabhi judta hai jab "Loan disbursement" record ho.
   ===================================================================== */

const MODES = ["UPI", "Bank transfer", "Cheque", "Cash", "Subsidy (DBT)", "Loan disbursement"];
const FILTERS = ["Overdue", "Partial", "Pending", "Paid", "Loan pending"];
const REST_TYPES = ["2 milestones (dispatch + commissioning)", "Monthly kisht"];
const LOAN_STATUS = ["Applied", "Approved", "Rejected"];
const TABS = ["Payment Mode & Plan", "Finance / Loan", "Installment Schedule"];
const PAGES = ["Payments & Outstanding", ...TABS];

const statusTone: Record<string, Tone> = { Overdue: "red", Partial: "amber", Pending: "slate", Paid: "green" };
const loanTone: Record<string, Tone> = { Applied: "slate", Approved: "amber", Disbursed: "green", Rejected: "red" };

type Source = "Customer" | "Loan";
type Item = { label: string; amt: number; due: string; source: Source };
type Pay = { id: number; date: string; amount: number; mode: string; ref: string; source: Source };
type Loan = { provider: string; appNo: string; status: string };
type Account = { id: number; project: string; customer: string; phone: string; total: number; schedule: Item[]; payments: Pay[]; loan?: Loan };
type PayDraft = { account: string; amount: string; mode: string; date: string; ref: string };
type PlanDraft = { account: string; advance: string; loan: string; provider: string; rest: string; count: string; first: string };

/* ---------- helpers ---------- */
const addDays = (iso: string, n: number) => { const x = new Date(`${iso}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const cu = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Customer" });
const lo = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Loan" });
const label = (a: Account) => `${a.project} · ${a.customer}`;

const SEED: Account[] = [
  { id: 1, project: "PRJ-101", customer: "Vikas Jain", phone: "98370 66418", total: 286000,
    schedule: [cu("Advance", 85800, d(-30)), cu("Material dispatch", 143000, d(-10)), cu("Commissioning", 57200, d(-2))],
    payments: [{ id: 11, date: d(-30), amount: 85800, mode: "UPI", ref: "UTR 4021…88", source: "Customer" }, { id: 12, date: d(-12), amount: 64200, mode: "Bank transfer", ref: "NEFT 7731…20", source: "Customer" }] },
  // ₹2,94,000 = ₹50,000 advance (UPI) + ₹2,00,000 loan + ₹44,000 customer ka baaki
  { id: 2, project: "PRJ-104", customer: "Anil Gupta", phone: "98765 43210", total: 294000,
    schedule: [cu("Advance", 50000, d(-3)), lo("Loan disbursement", 200000, d(10)), cu("Final contribution", 44000, d(25))],
    payments: [{ id: 21, date: d(-3), amount: 50000, mode: "UPI", ref: "UTR 9912…45", source: "Customer" }],
    loan: { provider: "SBI Rooftop Solar Loan", appNo: "SBI-SL-48213", status: "Approved" } },
  { id: 3, project: "PRJ-102", customer: "Hotel Taj View", phone: "99270 41122", total: 540000,
    schedule: [cu("Advance", 162000, d(-20)), cu("Material dispatch", 270000, d(-8)), cu("Commissioning", 108000, d(7))],
    payments: [{ id: 31, date: d(-20), amount: 162000, mode: "Cheque", ref: "Chq 004512", source: "Customer" }, { id: 32, date: d(-8), amount: 270000, mode: "Bank transfer", ref: "RTGS 5520…19", source: "Customer" }] },
  { id: 4, project: "PRJ-103", customer: "Meena Traders", phone: "99112 20345", total: 640000,
    schedule: [cu("Advance", 160000, d(2)), ...[1, 2, 3, 4, 5, 6].map((i) => cu(`Kisht ${i}/6`, 80000, d(30 * i)))], payments: [] },
  { id: 5, project: "PRJ-099", customer: "Sunil Yadav", phone: "97206 11890", total: 330000,
    schedule: [cu("Full payment", 330000, d(-20))],
    payments: [{ id: 51, date: d(-20), amount: 330000, mode: "Bank transfer", ref: "RTGS 3318…07", source: "Customer" }] },
  { id: 6, project: "PRJ-105", customer: "Rajesh Sharma", phone: "98971 55320", total: 180000, schedule: [], payments: [] },
];

const calc = (a: Account) => {
  const received = a.payments.reduce((s, p) => s + p.amount, 0);
  // customer ka paisa customer items me, loan ka paisa loan item me
  const pool: Record<Source, number> = { Customer: 0, Loan: 0 };
  a.payments.forEach((p) => { pool[p.source] += p.amount; });
  const ms = a.schedule.map((m) => { const paid = Math.min(pool[m.source], m.amt); pool[m.source] -= paid; return { ...m, paid }; });
  const next = ms.find((m) => m.paid < m.amt);
  const outstanding = a.total - received;
  const loanDue = ms.filter((m) => m.source === "Loan").reduce((s, m) => s + m.amt - m.paid, 0);
  const loanPaid = ms.filter((m) => m.source === "Loan").reduce((s, m) => s + m.paid, 0);
  const overdueAmt = ms.filter((m) => m.due < d(0)).reduce((s, m) => s + m.amt - m.paid, 0);
  const status = outstanding <= 0 ? "Paid" : next && next.due < d(0) ? "Overdue" : received > 0 ? "Partial" : "Pending";
  return { received, outstanding, ms, next, loanDue, loanPaid, overdueAmt, status };
};
const msStatus = (m: { paid: number; amt: number; due: string }) => (m.paid >= m.amt ? "Paid" : m.due < d(0) ? "Overdue" : m.paid > 0 ? "Partial" : "Pending");

const buildSchedule = (total: number, adv: number, loan: number, kisht: boolean, count: number, first: string): Item[] => {
  const items: Item[] = [];
  if (adv > 0) items.push(cu("Advance", adv, first));
  if (loan > 0) items.push(lo("Loan disbursement", loan, addDays(first, 15)));
  const rest = total - adv - loan;
  if (rest > 0) {
    if (kisht) {
      const each = Math.floor(rest / count);
      for (let i = 1; i <= count; i++) items.push(cu(`Kisht ${i}/${count}`, i === count ? rest - each * (count - 1) : each, addDays(first, 30 * i)));
    } else if (loan > 0) {
      items.push(cu("Final contribution", rest, addDays(first, 30)));
    } else {
      const m = Math.round(rest * 0.7);
      items.push(cu("Material dispatch", m, addDays(first, 15)), cu("Commissioning", rest - m, addDays(first, 30)));
    }
  }
  return items;
};

const planKind = (a: Account) => {
  const c = calc(a);
  return c.ms.length === 0 ? "Plan not set" : c.loanPaid + c.loanDue > 0 ? "Advance + loan + final" : c.ms.some((m) => m.label.startsWith("Kisht")) ? "Monthly kisht" : c.ms.length === 1 ? "Full payment" : "Advance + milestones";
};

const reminderUrl = (a: Account, m: { label: string; amt: number; paid: number; due: string }) =>
  `https://wa.me/91${a.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Namaste ${a.customer}, ${a.project} ka ${m.label} (${inr(m.amt - m.paid)}) ${fmtDate(m.due)} tak due hai. Kripya payment kar dein. – Vanshika Solar`)}`;

export default function PaymentsPage() {
  const [list, setList] = useState<Account[]>(SEED);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewId, setViewId] = useState<number | null>(null);
  const [tab, setTab] = useState(TABS[0]);
  const [page, setPage] = useState(PAGES[0]);
  const [payOpen, setPayOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [pay, setPay] = useState<PayDraft>({ account: label(SEED[0]), amount: "", mode: "UPI", date: d(0), ref: "" });
  const [plan, setPlan] = useState<PlanDraft>({ account: label(SEED[0]), advance: "", loan: "", provider: "", rest: REST_TYPES[0], count: "6", first: d(0) });
  const view = list.find((a) => a.id === viewId);

  const rows = useMemo(
    () => list.filter((a) => {
      const c = calc(a);
      const ok = filter === "all" || (filter === "Loan pending" ? c.loanDue > 0 : c.status === filter);
      return ok && `${a.customer} ${a.project} ${a.phone}`.toLowerCase().includes(q.toLowerCase());
    }),
    [list, q, filter],
  );
  const all = list.map(calc);
  const match = (a: Account) => `${a.customer} ${a.project} ${a.phone}`.toLowerCase().includes(q.toLowerCase());
  const installments = list
    .filter(match)
    .flatMap((a) => calc(a).ms.filter((m) => m.paid < m.amt).map((m) => ({ a, m })))
    .sort((x, y) => x.m.due.localeCompare(y.m.due));
  const setP = (k: keyof PayDraft) => (v: string) => setPay((s) => ({ ...s, [k]: v }));
  const setPl = (k: keyof PlanDraft) => (v: string) => setPlan((s) => ({ ...s, [k]: v }));

  /* ---------- Record payment ---------- */
  const openPay = (a: Account) => {
    const c = calc(a);
    setPay({ account: label(a), amount: c.next ? String(c.next.amt - c.next.paid) : "", mode: c.next?.source === "Loan" ? "Loan disbursement" : "UPI", date: d(0), ref: "" });
    setViewId(null); setPayOpen(true);
  };
  const payTarget = list.find((a) => label(a) === pay.account);
  const pc = payTarget ? calc(payTarget) : null;
  const amount = Number(pay.amount);
  const source: Source = pay.mode === "Loan disbursement" ? "Loan" : "Customer";
  const out = pc ? (source === "Loan" ? pc.loanDue : pc.outstanding - pc.loanDue) : 0;
  const payError = !payTarget ? "Select a customer."
    : source === "Loan" && !payTarget.loan ? "Is project par loan nahi hai."
    : source === "Loan" && !["Approved", "Disbursed"].includes(payTarget.loan?.status ?? "") ? "Loan abhi approved nahi hai. Disbursement tabhi record karo jab paisa aa jaye."
    : !(amount > 0) ? "Enter the amount received."
    : amount > out ? `${source === "Loan" ? "Loan pending" : "Customer outstanding"} sirf ${inr(out)} hai.`
    : pay.mode !== "Cash" && !pay.ref.trim() ? "Add UTR / cheque / reference number." : "";
  const savePay = () => {
    if (payError || !payTarget || !pc) return;
    setList((p) => p.map((a) => a.id !== payTarget.id ? a : {
      ...a,
      payments: [...a.payments, { id: Date.now(), date: pay.date, amount, mode: pay.mode, ref: pay.ref, source }],
      loan: a.loan && source === "Loan" && amount >= pc.loanDue ? { ...a.loan, status: "Disbursed" } : a.loan,
    }));
    setPayOpen(false);
  };

  /* ---------- Set / edit plan ---------- */
  const openPlan = (a: Account) => {
    const c = calc(a);
    const adv = a.schedule.find((m) => m.label === "Advance");
    setPlan({ account: label(a), advance: adv ? String(adv.amt) : "", loan: c.ms.some((m) => m.source === "Loan") ? String(c.ms.filter((m) => m.source === "Loan").reduce((s, m) => s + m.amt, 0)) : "", provider: a.loan?.provider ?? "", rest: a.schedule.some((m) => m.label.startsWith("Kisht")) ? REST_TYPES[1] : REST_TYPES[0], count: "6", first: d(0) });
    setViewId(null); setPlanOpen(true);
  };
  const planTarget = list.find((a) => label(a) === plan.account);
  const adv = Number(plan.advance) || 0;
  const loan = Number(plan.loan) || 0;
  const kisht = plan.rest === REST_TYPES[1];
  const count = Number(plan.count) || 0;
  const planError = !planTarget ? "Select a project."
    : adv < 0 || loan < 0 ? "Amount negative nahi ho sakta."
    : loan > 0 && !plan.provider.trim() ? "Bank / finance company ka naam daalo."
    : adv + loan > planTarget.total ? `Advance + loan (${inr(adv + loan)}) project value ${inr(planTarget.total)} se zyada hai.`
    : kisht && (count < 2 || count > 36) ? "Kisht 2 se 36 ke beech rakho."
    : kisht && planTarget.total - adv - loan <= 0 ? "Kisht ke liye baaki amount bachna chahiye." : "";
  const preview = planTarget && !planError ? buildSchedule(planTarget.total, adv, loan, kisht, count, plan.first) : [];
  const savePlan = () => {
    if (planError || !planTarget) return;
    setList((p) => p.map((a) => a.id !== planTarget.id ? a : {
      ...a, schedule: preview,
      loan: loan > 0 ? { provider: plan.provider.trim(), appNo: a.loan?.appNo ?? "", status: a.loan?.status ?? "Applied" } : undefined,
    }));
    setPlanOpen(false);
  };

  const setLoanField = (id: number, patch: Partial<Loan>) => setList((p) => p.map((a) => (a.id === id && a.loan ? { ...a, loan: { ...a.loan, ...patch } } : a)));

  return (
    <div className="!space-y-2">
      <PageHeader title="Payments & outstanding" subtitle="Kitna aana hai, kitna aaya, loan ka status aur agla payment — sab ek jagah.">
        <Button size="lg" className={darkBtn} onClick={() => openPay(list.find((a) => calc(a).outstanding > 0) ?? list[0])}><Plus /> Record payment</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<Wallet size={24} />} value={inr(all.reduce((s, c) => s + c.outstanding, 0))} label="Total outstanding" />
        <StatCard icon={<AlertCircle size={24} />} value={inr(all.reduce((s, c) => s + c.overdueAmt, 0))} label="Overdue amount" />
        <StatCard icon={<IndianRupee size={24} />} value={inr(all.reduce((s, c) => s + c.received, 0))} label="Total received" />
        <StatCard icon={<Landmark size={24} />} value={inr(all.reduce((s, c) => s + c.loanDue, 0))} label="Loan pending disbursement" />
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
        {PAGES.map((t) => (
          <button key={t} role="tab" aria-selected={page === t} onClick={() => setPage(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${page === t ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"}`}>{t}</button>
        ))}
      </div>
      {page === PAGES[0] && (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap gap-3 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer, project or phone" aria-label="Search payments" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
            </div>
            <Select value={filter || null} onValueChange={(value) => setFilter(value ?? "")}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>{["Customer", "Order value", "Received", "Outstanding", "Next payment", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const c = calc(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={a.customer} /><div><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{a.project} · {a.phone}</p></div></div></TableCell>
                    <TableCell className="px-4">{inr(a.total)}</TableCell>
                    <TableCell className="px-4 text-green-700">{inr(c.received)}</TableCell>
                    <TableCell className={`px-4 font-semibold ${c.status === "Overdue" ? "text-red-600" : ""}`}>
                      {inr(c.outstanding)}
                      {c.loanDue > 0 && <p className="text-xs font-normal text-muted-foreground">incl. {inr(c.loanDue)} loan</p>}
                    </TableCell>
                    <TableCell className="px-4">
                      {c.next ? (
                        <div>
                          <p className="font-medium">{c.next.label} · {inr(c.next.amt - c.next.paid)}</p>
                          <p className={`text-sm ${c.next.due < d(0) ? "text-red-600" : "text-muted-foreground"}`}>Due {dayLabel(c.next.due)}</p>
                        </div>
                      ) : a.schedule.length === 0 ? (
                        <Button variant="link" className="h-auto p-0 text-sm" onClick={() => openPlan(a)}>Set plan</Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge tone={statusTone[c.status]}>{c.status}</StatusBadge>
                        {a.loan && <StatusBadge tone={loanTone[a.loan.status]}>Loan {a.loan.status}</StatusBadge>}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button variant="ghost" size="icon" aria-label={`View ${a.customer}`} onClick={() => { setTab(TABS[0]); setViewId(a.id); }}><Eye /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Record payment for ${a.customer}`} disabled={c.outstanding <= 0} onClick={() => openPay(a)}><IndianRupee /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">No accounts match. Change the filter.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Panel>
      )}

      {page !== PAGES[0] && (
        <Panel className="overflow-hidden">
          <div className="p-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer, project or phone" aria-label="Search" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
            </div>
          </div>

          {page === PAGES[1] && (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>{["Customer", "Project value", "Plan type", "Payment mode", "Advance", "Loan", "Customer contribution", ""].map((h, i) => <TableHead key={i} className={thCls}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {list.filter(match).map((a) => {
                  const c = calc(a);
                  const loanTotal = c.loanPaid + c.loanDue;
                  const advItem = c.ms.find((m) => m.label === "Advance");
                  const modes = Array.from(new Set(a.payments.map((p) => p.mode))).join(", ");
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={a.customer} /><div><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{a.project} · {a.phone}</p></div></div></TableCell>
                      <TableCell className="px-4">{inr(a.total)}</TableCell>
                      <TableCell className="px-4">{planKind(a)}</TableCell>
                      <TableCell className="px-4">{modes || "—"}</TableCell>
                      <TableCell className="px-4">{advItem ? inr(advItem.amt) : "—"}</TableCell>
                      <TableCell className="px-4">{loanTotal ? inr(loanTotal) : "—"}</TableCell>
                      <TableCell className="px-4 font-semibold">{inr(a.total - loanTotal)}</TableCell>
                      <TableCell className="px-4 text-right">
                        <Button variant="ghost" size="icon" aria-label={`Edit plan of ${a.customer}`} onClick={() => openPlan(a)}><Settings2 /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {page === PAGES[2] && (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>{["Customer", "Bank / finance", "Application no.", "Loan amount", "Disbursed", "Pending", "Status", ""].map((h, i) => <TableHead key={i} className={thCls}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {list.filter((a) => a.loan && match(a)).map((a) => {
                  const c = calc(a);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={a.customer} /><div><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{a.project}</p></div></div></TableCell>
                      <TableCell className="px-4">{a.loan?.provider}</TableCell>
                      <TableCell className="px-4">{a.loan?.appNo || "—"}</TableCell>
                      <TableCell className="px-4">{inr(c.loanPaid + c.loanDue)}</TableCell>
                      <TableCell className="px-4 text-green-700">{inr(c.loanPaid)}</TableCell>
                      <TableCell className="px-4 font-semibold">{inr(c.loanDue)}</TableCell>
                      <TableCell className="px-4"><StatusBadge tone={loanTone[a.loan?.status ?? "Applied"]}>{a.loan?.status}</StatusBadge></TableCell>
                      <TableCell className="px-4 text-right">
                        <Button variant="ghost" size="icon" aria-label={`Open loan of ${a.customer}`} onClick={() => { setTab(TABS[1]); setViewId(a.id); }}><Eye /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Record disbursement for ${a.customer}`} disabled={c.loanDue <= 0 || a.loan?.status === "Rejected"} onClick={() => openPay(a)}><IndianRupee /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.filter((a) => a.loan && match(a)).length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">Koi loan nahi mila.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}

          {page === PAGES[3] && (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>{["Due date", "Customer", "Installment", "Amount", "Paid", "Status", ""].map((h, i) => <TableHead key={i} className={thCls}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {installments.map(({ a, m }) => {
                  const st = msStatus(m);
                  return (
                    <TableRow key={`${a.id}-${m.label}`}>
                      <TableCell className={`px-4 py-3 ${st === "Overdue" ? "text-red-600" : ""}`}>{fmtDate(m.due)}</TableCell>
                      <TableCell className="px-4"><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{a.project}</p></TableCell>
                      <TableCell className="px-4">{m.label}{m.source === "Loan" && <span className="text-sm text-muted-foreground"> (bank se)</span>}</TableCell>
                      <TableCell className="px-4">{inr(m.amt)}</TableCell>
                      <TableCell className="px-4 text-green-700">{inr(m.paid)}</TableCell>
                      <TableCell className="px-4"><StatusBadge tone={statusTone[st]}>{st}</StatusBadge></TableCell>
                      <TableCell className="px-4 text-right">
                        {m.source === "Customer" && (
                          <Button asChild variant="ghost" size="icon" aria-label="WhatsApp reminder"><a href={reminderUrl(a, m)} target="_blank" rel="noreferrer"><MessageCircle /></a></Button>
                        )}
                        <Button variant="ghost" size="icon" aria-label={`Record payment for ${a.customer}`} onClick={() => openPay(a)}><IndianRupee /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {installments.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">Koi pending installment nahi hai.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </Panel>
      )}

      {/* ---------- Record payment ---------- */}
      <SideSheet open={payOpen} onOpenChange={setPayOpen} title="Record payment" description="Customer ka payment customer milestone me jata hai, loan disbursement loan milestone me." error={payError} saveLabel="Save payment" onSave={savePay}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Customer / project" value={pay.account} onChange={setP("account")} options={list.map(label)} />
          {payTarget && pc && (
            <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">
              Customer se baaki: <span className="font-semibold text-foreground">{inr(pc.outstanding - pc.loanDue)}</span>
              {pc.loanDue > 0 && <> · Loan se baaki: <span className="font-semibold text-foreground">{inr(pc.loanDue)}</span></>}
            </p>
          )}
          <TextField label="Amount received (₹)" type="number" min={0} value={pay.amount} onChange={setP("amount")} />
          <SelectField label="Mode" value={pay.mode} onChange={setP("mode")} options={MODES} />
          <TextField label="Date" type="date" value={pay.date} onChange={setP("date")} />
          <TextField label="UTR / cheque / reference" value={pay.ref} onChange={setP("ref")} placeholder={pay.mode === "Cash" ? "Optional for cash" : "Transaction number"} />
        </div>
      </SideSheet>

      {/* ---------- Set / edit plan ---------- */}
      <SideSheet open={planOpen} onOpenChange={setPlanOpen} title="Payment plan" description="Sirf advance, loan (agar hai) aur baaki payment ka tarika batao. Schedule apne aap ban jayega." error={planError} saveLabel="Save plan" onSave={savePlan}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Project / customer" value={plan.account} onChange={setPl("account")} options={list.map(label)} />
          {planTarget && <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">Project value: <span className="font-semibold text-foreground">{inr(planTarget.total)}</span></p>}
          <TextField label="Advance (₹)" type="number" min={0} value={plan.advance} onChange={setPl("advance")} />
          <TextField label="Pehli due date" type="date" value={plan.first} onChange={setPl("first")} />
          <TextField label="Loan amount (₹) — agar loan hai" type="number" min={0} value={plan.loan} onChange={setPl("loan")} />
          <TextField label="Bank / finance company" value={plan.provider} onChange={setPl("provider")} placeholder="e.g. SBI Rooftop Solar Loan" />
          <SelectField className={kisht ? "" : "sm:col-span-2"} label="Baaki payment kaise?" value={plan.rest} onChange={setPl("rest")} options={REST_TYPES} />
          {kisht && <TextField label="Kitni kisht (monthly)" type="number" min={2} value={plan.count} onChange={setPl("count")} />}
        </div>
        {preview.length > 0 && planTarget && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">Schedule preview</p>
            <ul className="space-y-1.5">
              {preview.map((m) => (
                <li key={m.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{m.label}{m.source === "Loan" && <span className="text-muted-foreground"> (bank se)</span>}</span>
                  <span className="text-muted-foreground">{inr(m.amt)} · {fmtDate(m.due)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">Customer ko dena hai: <span className="font-semibold text-foreground">{inr(planTarget.total - loan)}</span></p>
          </div>
        )}
      </SideSheet>

      {/* ---------- Detail ---------- */}
      {view && (() => {
        const c = calc(view);
        const loanTotal = c.loanPaid + c.loanDue;
        const advItem = c.ms.find((m) => m.label === "Advance");
        const modes = Array.from(new Set(view.payments.map((p) => p.mode))).join(", ");
        const kind = c.ms.length === 0 ? "Plan not set" : loanTotal > 0 ? "Advance + loan + final" : c.ms.some((m) => m.label.startsWith("Kisht")) ? "Monthly kisht" : c.ms.length === 1 ? "Full payment" : "Advance + milestones";
        return (
          <DetailDialog wide open onOpenChange={() => setViewId(null)} title={view.customer} description={`${view.project} · ${view.phone}`}
            footer={<>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => openPlan(view)}><Settings2 /> {view.schedule.length ? "Edit plan" : "Set plan"}</Button>
              <Button size="lg" className={darkBtn} disabled={c.outstanding <= 0} onClick={() => openPay(view)}><IndianRupee /> Record payment</Button>
            </>}>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <KV label="Order value">{inr(view.total)}</KV>
                <KV label="Received">{inr(c.received)}</KV>
                <KV label="Outstanding"><span className={c.status === "Overdue" ? "text-red-600" : ""}>{inr(c.outstanding)}</span></KV>
              </div>

              <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {TABS.map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
                ))}
              </div>

              {tab === TABS[0] && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KV label="Payment type">{kind}</KV>
                    <KV label="Payment mode">{modes || "—"}</KV>
                    <KV label="Advance">{advItem ? inr(advItem.amt) : "—"}</KV>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KV label="Loan / finance">{loanTotal ? inr(loanTotal) : "—"}</KV>
                    <KV label="Customer contribution">{inr(view.total - loanTotal)}</KV>
                    <KV label="Customer se baaki">{inr(c.outstanding - c.loanDue)}</KV>
                  </div>
                  {c.ms.length === 0 && <p className="text-muted-foreground">Plan set nahi hai. Neeche “Set plan” dabao.</p>}
                </div>
              )}

              {tab === TABS[1] && (
                view.loan ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-semibold">{view.loan.provider}</p><p className="text-sm text-muted-foreground">Loan {inr(loanTotal)} · Aaya {inr(c.loanPaid)} · Baaki {inr(c.loanDue)}</p></div>
                      {view.loan.status === "Disbursed"
                        ? <StatusBadge tone="green">Disbursed</StatusBadge>
                        : <SelectField label="" value={view.loan.status} onChange={(v) => setLoanField(view.id, { status: v })} options={LOAN_STATUS} />}
                    </div>
                    <div className="mt-3 max-w-xs"><TextField label="Application number" value={view.loan.appNo} onChange={(v) => setLoanField(view.id, { appNo: v })} /></div>
                    {view.loan.status !== "Disbursed" && <p className="mt-2 text-xs text-muted-foreground">Loan amount “Received” me tabhi judega jab “Loan disbursement” record hoga.</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">Is project par loan / finance nahi hai. Agar customer loan le raha hai to plan me loan amount aur bank ka naam daalo.</p>
                    <Button variant="outline" size="lg" className={outBtn} onClick={() => openPlan(view)}><Landmark /> Add loan to plan</Button>
                  </div>
                )
              )}

              {tab === TABS[2] && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Installments</p>
                    {c.ms.length === 0 ? <p className="text-muted-foreground">Plan set nahi hai. “Set plan” dabao.</p> : (
                      <ul className="space-y-2">
                        {c.ms.map((m) => {
                          const st = msStatus(m);
                          return (
                            <li key={m.label} className="rounded-xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium">{m.label} {m.source === "Loan" && <span className="text-sm text-muted-foreground">(bank se)</span>}</span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge tone={statusTone[st]}>{st}</StatusBadge>
                                  {st !== "Paid" && m.source === "Customer" && (
                                    <Button asChild variant="outline" size="sm"><a href={reminderUrl(view, m)} target="_blank" rel="noreferrer"><MessageCircle /> Reminder</a></Button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${(m.paid / m.amt) * 100}%` }} /></div>
                              <p className="mt-1.5 text-sm text-muted-foreground">{inr(m.paid)} of {inr(m.amt)} · due {fmtDate(m.due)}</p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Payment history</p>
                    {view.payments.length === 0 ? <p className="text-muted-foreground">No payments yet.</p> : (
                      <ul className="space-y-2">
                        {[...view.payments].reverse().map((p) => (
                          <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                            <div><p className="font-medium">{inr(p.amount)}</p><p className="text-sm text-muted-foreground">{p.mode} · {p.ref || "No reference"}</p></div>
                            <span className="text-sm text-muted-foreground">{fmtDate(p.date)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DetailDialog>
        );
      })()}
    </div>
  );
}