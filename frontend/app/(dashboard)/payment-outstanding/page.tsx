"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, fmtDate, dayLabel, inr, outBtn, thCls } from "@/components/master/module-kit";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";
import { AlertCircle, Eye, IndianRupee, Landmark, MessageCircle, Plus, Search, Settings2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* =====================================================================
   Payments, Plans & Loan — ek hi page
   Flow: Payment type chuno (Cash / Milestones / Kisht / Finance)
         → Plan se schedule banta hai → Payment record → Loan track
   Loan amount "Received" me tabhi judta hai jab "Loan disbursement" record ho.
   ===================================================================== */

type PlanType = "Cash" | "Milestone" | "Kisht" | "Finance";
type Source = "Customer" | "Loan";
type Item = { label: string; amt: number; due: string; source: Source };
type Pay = { id: string; date: string; amount: number; mode: string; ref: string; source: Source };
type Loan = { provider: string; appNo: string; status: string };
type Account = { id: string; project: string; customer: string; phone: string; total: number; mode: PlanType | ""; schedule: Item[]; payments: Pay[]; loan?: Loan };
type PayDraft = { account: string; amount: string; mode: string; date: string; ref: string };
type PlanDraft = { account: string; type: PlanType; total: string; advance: string; loan: string; provider: string; appNo: string; count: string; first: string };

// Customer ne paisa kaise dena hai (plan) — instrument (UPI, Cash...) alag cheez hai, wo MODES me hai.
const PLAN_TYPES: { key: PlanType; label: string; short: string; hint: string }[] = [
  { key: "Cash", label: "Cash / Full payment", short: "Cash", hint: "Poora paisa ek hi baar me" },
  { key: "Milestone", label: "Advance + Milestones", short: "Milestones", hint: "Advance, phir dispatch aur commissioning par" },
  { key: "Kisht", label: "Monthly Kisht", short: "Kisht", hint: "Advance ke baad har mahine ek kisht" },
  { key: "Finance", label: "Bank Finance / Loan", short: "Finance", hint: "Bank loan + customer ka apna hissa" },
];
const typeShort = (t: PlanType | "") => PLAN_TYPES.find((p) => p.key === t)?.short ?? "Not set";
const typeTone: Record<PlanType, Tone> = { Cash: "green", Milestone: "slate", Kisht: "amber", Finance: "indigo" };
type ApiRecord = Record<string, unknown>;
const asRecord = (value: unknown): ApiRecord => value && typeof value === "object" ? value as ApiRecord : {};
const asRecords = (value: unknown): ApiRecord[] => Array.isArray(value) ? value.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object") : [];

const MODES = ["UPI", "Bank transfer", "Cheque", "Cash", "Subsidy (DBT)", "Loan disbursement"];
const FILTERS = ["Overdue", "Partial", "Pending", "Paid", "Loan pending"];
const LOAN_STATUS = ["Applied", "Approved", "Rejected"];
const PAGES = ["Payments & Outstanding", "Payment Plans", "Finance / Loan", "Installment Schedule"];

const statusTone: Record<string, Tone> = { Overdue: "red", Partial: "amber", Pending: "slate", Paid: "green" };
const loanTone: Record<string, Tone> = { Applied: "slate", Approved: "amber", Disbursed: "green", Rejected: "red" };

/* ---------- helpers ---------- */
const addDays = (iso: string, n: number) => { const x = new Date(`${iso}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const cu = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Customer" });
const lo = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Loan" });
const label = (a: Account) => `${a.project} · ${a.customer}`;
const matches = (a: Account, q: string) => `${a.customer} ${a.project} ${a.phone}`.toLowerCase().includes(q.trim().toLowerCase());

const fromApi = (record: ApiRecord): Account => {
  const project = asRecord(record.project);
  const customer = asRecord(project.customer);
  const plan = asRecord(record.plan);
  const schedule = asRecords(plan.installments).map((item) => ({
    label: String(item.label), amt: Number(item.amount), due: String(item.dueDate).slice(0, 10), source: item.source as Source,
  }));
  const payments = asRecords(record.payments).map((item) => ({
    id: String(item._id), date: String(item.paymentDate).slice(0, 10), amount: Number(item.amount),
    mode: String(item.mode), ref: String(item.reference ?? ""), source: item.source as Source,
  }));
  return {
    id: String(project._id), project: String(project.projectCode ?? "Project"),
    customer: String(customer.customerName ?? "Customer"), phone: String(customer.phone ?? ""),
    total: Number(record.totalAmount ?? 0), mode: (plan.planType ?? "") as PlanType | "",
    schedule, payments,
    ...(record.plan && (plan.planType === "Finance" || schedule.some((item) => item.source === "Loan")) ? { loan: {
      provider: String(plan.loanProvider ?? ""), appNo: String(plan.loanApplicationNumber ?? ""),
      status: String(plan.loanStatus ?? "Applied"),
    } } : {}),
  };
};

const calc = (a: Account) => {
  const received = a.payments.reduce((s, p) => s + p.amount, 0);
  // customer ka paisa customer items me, loan ka paisa loan item me
  const pool: Record<Source, number> = { Customer: 0, Loan: 0 };
  a.payments.forEach((p) => { pool[p.source] += p.amount; });
  const ms = a.schedule.map((m) => { const paid = Math.min(pool[m.source], m.amt); pool[m.source] -= paid; return { ...m, paid }; });
  const next = ms.find((m) => m.paid < m.amt);
  const outstanding = Math.max(a.total - received, 0);
  const loanDue = ms.filter((m) => m.source === "Loan").reduce((s, m) => s + m.amt - m.paid, 0);
  const loanPaid = ms.filter((m) => m.source === "Loan").reduce((s, m) => s + m.paid, 0);
  const overdueAmt = ms.filter((m) => m.due < d(0)).reduce((s, m) => s + m.amt - m.paid, 0);
  const status = a.total > 0 && outstanding <= 0 ? "Paid" : next && next.due < d(0) ? "Overdue" : received > 0 ? "Partial" : "Pending";
  return { received, outstanding, ms, next, loanDue, loanPaid, overdueAmt, status };
};
const msStatus = (m: { paid: number; amt: number; due: string }) => (m.paid >= m.amt ? "Paid" : m.due < d(0) ? "Overdue" : m.paid > 0 ? "Partial" : "Pending");

const buildSchedule = (total: number, type: PlanType, adv: number, loan: number, count: number, first: string): Item[] => {
  if (type === "Cash") return [cu("Full payment", total, first)];
  const items: Item[] = [];
  if (adv > 0) items.push(cu("Advance", adv, first));
  if (type === "Finance") items.push(lo("Loan disbursement", loan, addDays(first, 15)));
  const rest = total - adv - (type === "Finance" ? loan : 0);
  if (rest <= 0) return items;
  if (type === "Kisht") {
    const each = Math.floor(rest / count);
    for (let i = 1; i <= count; i++) items.push(cu(`Kisht ${i}/${count}`, i === count ? rest - each * (count - 1) : each, addDays(first, 30 * i)));
  } else if (type === "Finance") {
    items.push(cu("Final contribution", rest, addDays(first, 30)));
  } else {
    const m = Math.round(rest * 0.7);
    items.push(cu("Material dispatch", m, addDays(first, 15)), cu("Commissioning", rest - m, addDays(first, 30)));
  }
  return items;
};

// Plan ka ek line ka summary (Payment Plans tab ke liye)
const planDetail = (a: Account) => {
  const c = calc(a);
  if (!a.mode || c.ms.length === 0) return "—";
  if (a.mode === "Kisht") { const k = c.ms.filter((m) => m.label.startsWith("Kisht")); return `${k.length} kisht × ${inr(k[0]?.amt ?? 0)}`; }
  if (a.mode === "Finance") return a.loan?.provider || "—";
  if (a.mode === "Milestone") { const n = c.ms.filter((m) => m.label !== "Advance").length; return `${n} milestone${n === 1 ? "" : "s"}`; }
  return `Due ${fmtDate(c.ms[0].due)}`;
};

const reminderUrl = (a: Account, m: { label: string; amt: number; paid: number; due: string }) =>
  `https://wa.me/91${a.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Namaste ${a.customer}, ${a.project} ka ${m.label} (${inr(m.amt - m.paid)}) ${fmtDate(m.due)} tak due hai. Kripya payment kar dein. – Vanshika Solar`)}`;

const AccountCell = ({ a, sub }: { a: Account; sub?: string }) => (
  <div className="flex items-center gap-3"><Avatar name={a.customer} /><div><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{sub ?? `${a.project} · ${a.phone}`}</p></div></div>
);

const TypeBadge = ({ a, onSet }: { a: Account; onSet: () => void }) =>
  a.mode ? <StatusBadge tone={typeTone[a.mode]}>{typeShort(a.mode)}</StatusBadge>
    : <Button variant="link" className="h-auto p-0 text-sm text-amber-700" onClick={onSet}>Set payment type</Button>;

export default function PaymentsPage() {
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);
  const [page, setPage] = useState(PAGES[0]);
  const [payOpen, setPayOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [pay, setPay] = useState<PayDraft>({ account: "", amount: "", mode: "UPI", date: d(0), ref: "" });
  const [plan, setPlan] = useState<PlanDraft>({ account: "", type: "Milestone", total: "", advance: "", loan: "", provider: "", appNo: "", count: "6", first: d(0) });
  const load = useCallback(async () => {
    const records = await getAllPages<ApiRecord>("/payments/accounts");
    setList(records.map(fromApi));
    setRequestError("");
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load payment accounts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);
  const view = list.find((a) => a.id === viewId);

  const rows = useMemo(
    () => list.filter((a) => {
      const c = calc(a);
      const okStatus = filter === "all" || (filter === "Loan pending" ? c.loanDue > 0 : c.status === filter);
      const okType = typeFilter === "all" || (typeFilter === "none" ? !a.mode : a.mode === typeFilter);
      return okStatus && okType && matches(a, q);
    }),
    [list, q, filter, typeFilter],
  );
  const all = list.map(calc);
  const filtered = list.filter((a) => matches(a, q));
  const installments = filtered
    .flatMap((a) => calc(a).ms.filter((m) => m.paid < m.amt).map((m) => ({ a, m })))
    .sort((x, y) => x.m.due.localeCompare(y.m.due));
  const loans = filtered.filter((a) => a.loan);
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
    : !payTarget.mode ? "Set a payment plan before recording project receipts."
    : source === "Loan" && !payTarget.loan ? "Is project par loan nahi hai."
    : source === "Loan" && !["Approved", "Disbursed"].includes(payTarget.loan?.status ?? "") ? "Loan abhi approved nahi hai. Disbursement tabhi record karo jab paisa aa jaye."
    : !(amount > 0) ? "Enter the amount received."
    : amount > out ? `${source === "Loan" ? "Loan pending" : "Customer outstanding"} sirf ${inr(out)} hai.`
    : pay.mode !== "Cash" && !pay.ref.trim() ? "Add UTR / cheque / reference number." : "";
  const savePay = async () => {
    if (payError || !payTarget || !pc) return;
    try {
      await api.post("/payments", {
        projectId: payTarget.id, amount, mode: pay.mode, paymentDate: pay.date,
        reference: pay.ref, source,
      });
      await load();
      setPayOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not record payment.");
    }
  };

  /* ---------- Set / edit plan ---------- */
  const openPlan = (a: Account) => {
    const c = calc(a);
    const advItem = a.schedule.find((m) => m.label === "Advance");
    const kishts = a.schedule.filter((m) => m.label.startsWith("Kisht")).length;
    setPlan({
      account: label(a), type: a.mode || "Milestone", total: String(a.total || ""),
      advance: advItem ? String(advItem.amt) : "",
      loan: c.loanPaid + c.loanDue > 0 ? String(c.loanPaid + c.loanDue) : "",
      provider: a.loan?.provider ?? "", appNo: a.loan?.appNo ?? "",
      count: String(kishts || 6), first: a.schedule[0]?.due ?? d(0),
    });
    setViewId(null); setPlanOpen(true);
  };
  const planTarget = list.find((a) => label(a) === plan.account);
  const t = plan.type;
  const planTotal = Number(plan.total) || 0;
  const adv = t === "Cash" ? 0 : Number(plan.advance) || 0;
  const loan = t === "Finance" ? Number(plan.loan) || 0 : 0;
  const count = Number(plan.count) || 0;
  const customerPaid = planTarget ? planTarget.payments.filter((p) => p.source === "Customer").reduce((s, p) => s + p.amount, 0) : 0;
  const hasLoanPayments = !!planTarget?.payments.some((p) => p.source === "Loan");
  const planError = !planTarget ? "Select a project."
    : Number(plan.advance) < 0 || Number(plan.loan) < 0 ? "Amount negative nahi ho sakta."
    : !plan.first ? "Pehli due date chuno."
    : hasLoanPayments && t !== "Finance" ? "Is project me loan disbursement record ho chuka hai, isliye payment type Finance hi rahega."
    : t === "Finance" && !(loan > 0) ? "Loan amount daalo."
    : t === "Finance" && !plan.provider.trim() ? "Bank / finance company ka naam daalo."
    : !(planTotal > 0) ? "Project value zero se zyada enter karein."
    : t === "Finance" && adv + loan > planTotal ? `Advance + loan (${inr(adv + loan)}) project value ${inr(planTotal)} se zyada hai.`
    : (t === "Milestone" || t === "Kisht") && adv >= planTotal ? "Advance project value se kam rakho."
    : t === "Kisht" && (count < 2 || count > 36) ? "Kisht 2 se 36 ke beech rakho."
    : customerPaid > planTotal - loan ? `Customer se ${inr(customerPaid)} pehle hi aa chuka hai, plan me customer ka hissa ${inr(planTotal - loan)} se kam nahi ho sakta.` : "";
  const preview = planTarget && !planError ? buildSchedule(planTotal, t, adv, loan, count, plan.first) : [];
  const savePlan = async () => {
    if (planError || !planTarget) return;
    try {
      await api.put(`/payments/accounts/${planTarget.id}/plan`, {
        planType: t, totalAmount: planTotal,
        installments: preview.map((item) => ({ label: item.label, amount: item.amt, dueDate: item.due, source: item.source })),
        loanProvider: t === "Finance" ? plan.provider.trim() : "",
        loanApplicationNumber: t === "Finance" ? plan.appNo.trim() : "",
        loanStatus: planTarget.loan?.status ?? "Applied",
      });
      await load();
      setPlanOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save payment plan.");
    }
  };

  const setLoanField = async (id: string, patch: Partial<Loan>) => {
    const account = list.find((item) => item.id === id);
    if (!account?.mode || !account.schedule.length || !account.loan) return;
    const updatedLoan = { ...account.loan, ...patch };
    try {
      await api.put(`/payments/accounts/${id}/plan`, {
        planType: account.mode, totalAmount: account.total,
        installments: account.schedule.map((item) => ({ label: item.label, amount: item.amt, dueDate: item.due, source: item.source })),
        loanProvider: updatedLoan.provider, loanApplicationNumber: updatedLoan.appNo,
        loanStatus: updatedLoan.status,
      });
      await load();
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update loan details.");
    }
  };

  const searchBox = (
    <div className="relative min-w-[240px] flex-1">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer, project or phone" aria-label="Search" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
    </div>
  );

  return (
    <div className="!space-y-2">
      <PageHeader title="Payments & outstanding" subtitle="Customer cash dega, kisht me ya finance se — kitna aana hai, kitna aaya aur agla payment, sab ek jagah.">
        <Button size="lg" variant="outline" className={outBtn} disabled={!list.length} onClick={() => openPlan(list.find((a) => !a.mode) ?? list[0])}><Settings2 /> Set payment plan</Button>
        <Button size="lg" className={darkBtn} disabled={!list.length} onClick={() => openPay(list.find((a) => calc(a).outstanding > 0) ?? list[0])}><Plus /> Record payment</Button>
      </PageHeader>
      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-4 text-sm text-muted-foreground">Loading payment accounts...</Panel>}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<Wallet size={24} />} value={inr(all.reduce((s, c) => s + c.outstanding, 0))} label="Total outstanding" />
        <StatCard icon={<AlertCircle size={24} />} value={inr(all.reduce((s, c) => s + c.overdueAmt, 0))} label="Overdue amount" />
        <StatCard icon={<IndianRupee size={24} />} value={inr(all.reduce((s, c) => s + c.received, 0))} label="Total received" />
        <StatCard icon={<Landmark size={24} />} value={inr(all.reduce((s, c) => s + c.loanDue, 0))} label="Loan pending disbursement" />
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
        {PAGES.map((p) => (
          <button key={p} role="tab" aria-selected={page === p} onClick={() => setPage(p)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${page === p ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"}`}>{p}</button>
        ))}
      </div>

      {/* ---------- Tab 1: Payments & Outstanding ---------- */}
      {page === PAGES[0] && (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap gap-3 p-4">
            {searchBox}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-[190px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by payment type"><SelectValue placeholder="All payment types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment types</SelectItem>
                {PLAN_TYPES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                <SelectItem value="none">Plan not set</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>{["Customer", "Order value", "Payment type", "Received", "Outstanding", "Next payment", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const c = calc(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3"><AccountCell a={a} /></TableCell>
                    <TableCell className="px-4">{inr(a.total)}</TableCell>
                    <TableCell className="px-4"><TypeBadge a={a} onSet={() => openPlan(a)} /></TableCell>
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
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge tone={statusTone[c.status]}>{c.status}</StatusBadge>
                        {a.loan && <StatusBadge tone={loanTone[a.loan.status]}>Loan {a.loan.status}</StatusBadge>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 text-right">
                      <Button variant="ghost" size="icon" title="View details" aria-label={`View ${a.customer}`} onClick={() => setViewId(a.id)}><Eye /></Button>
                      <Button variant="outline" size="sm" className="ml-1 rounded-lg" aria-label={`Edit plan of ${a.customer}`} onClick={() => openPlan(a)}><Settings2 /> Plan</Button>
                      <Button variant="outline" size="sm" className="ml-1 rounded-lg" aria-label={`Record payment for ${a.customer}`} disabled={c.outstanding <= 0} onClick={() => openPay(a)}><IndianRupee /> Payment</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No accounts match. Change the filter.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* ---------- Tab 2: Payment Plans ---------- */}
      {page === PAGES[1] && (
        <Panel className="overflow-hidden">
          <div className="space-y-3 p-4">
            {searchBox}
            <div className="flex flex-wrap gap-2">
              {PLAN_TYPES.map((p) => <Chip key={p.key}>{p.short}: {list.filter((a) => a.mode === p.key).length}</Chip>)}
              <Chip>Not set: {list.filter((a) => !a.mode).length}</Chip>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>{["Customer", "Project value", "Payment type", "Plan detail", "Advance", "Loan (bank)", "Customer contribution"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const c = calc(a);
                const loanTotal = c.loanPaid + c.loanDue;
                const advItem = c.ms.find((m) => m.label === "Advance");
                return (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3"><AccountCell a={a} /></TableCell>
                    <TableCell className="px-4">{inr(a.total)}</TableCell>
                    <TableCell className="px-4"><TypeBadge a={a} onSet={() => openPlan(a)} /></TableCell>
                    <TableCell className="px-4">{planDetail(a)}</TableCell>
                    <TableCell className="px-4">{advItem ? inr(advItem.amt) : "—"}</TableCell>
                    <TableCell className="px-4">{loanTotal ? inr(loanTotal) : "—"}</TableCell>
                    <TableCell className="px-4 font-semibold">{inr(a.total - loanTotal)}</TableCell>
                    <TableCell className="px-4 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Edit plan of ${a.customer}`} onClick={() => openPlan(a)}><Settings2 /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No accounts match.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* ---------- Tab 3: Finance / Loan ---------- */}
      {page === PAGES[2] && (
        <Panel className="overflow-hidden">
          <div className="p-4">{searchBox}</div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>{["Customer", "Bank / finance", "Application no.", "Loan amount", "Disbursed", "Pending", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((a) => {
                const c = calc(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3"><AccountCell a={a} sub={a.project} /></TableCell>
                    <TableCell className="px-4">{a.loan?.provider}</TableCell>
                    <TableCell className="px-4">{a.loan?.appNo || "—"}</TableCell>
                    <TableCell className="px-4">{inr(c.loanPaid + c.loanDue)}</TableCell>
                    <TableCell className="px-4 text-green-700">{inr(c.loanPaid)}</TableCell>
                    <TableCell className="px-4 font-semibold">{inr(c.loanDue)}</TableCell>
                    <TableCell className="px-4"><StatusBadge tone={loanTone[a.loan?.status ?? "Applied"]}>{a.loan?.status}</StatusBadge></TableCell>
                    <TableCell className="whitespace-nowrap px-4 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Open loan of ${a.customer}`} onClick={() => setViewId(a.id)}><Eye /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Record disbursement for ${a.customer}`} disabled={c.loanDue <= 0 || a.loan?.status === "Rejected"} onClick={() => openPay(a)}><IndianRupee /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {loans.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">Koi loan nahi mila. Payment type “Bank Finance / Loan” wale customers yahan dikhenge.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* ---------- Tab 4: Installment Schedule ---------- */}
      {page === PAGES[3] && (
        <Panel className="overflow-hidden">
          <div className="p-4">{searchBox}</div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>{["Due date", "Customer", "Installment", "Amount", "Paid", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {installments.map(({ a, m }) => {
                const st = msStatus(m);
                return (
                  <TableRow key={`${a.id}-${m.label}`}>
                    <TableCell className={`px-4 py-3 ${st === "Overdue" ? "text-red-600" : ""}`}>{fmtDate(m.due)}</TableCell>
                    <TableCell className="px-4"><p className="font-semibold">{a.customer}</p><p className="text-sm text-muted-foreground">{a.project} · {typeShort(a.mode)}</p></TableCell>
                    <TableCell className="px-4">{m.label}{m.source === "Loan" && <span className="text-sm text-muted-foreground"> (bank se)</span>}</TableCell>
                    <TableCell className="px-4">{inr(m.amt)}</TableCell>
                    <TableCell className="px-4 text-green-700">{inr(m.paid)}</TableCell>
                    <TableCell className="px-4"><StatusBadge tone={statusTone[st]}>{st}</StatusBadge></TableCell>
                    <TableCell className="whitespace-nowrap px-4 text-right">
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
        </Panel>
      )}

      {/* ---------- Record payment ---------- */}
      <SideSheet open={payOpen} onOpenChange={setPayOpen} title="Record payment" description="Customer ka payment customer milestone me jata hai, loan disbursement loan milestone me." error={payError} saveLabel="Save payment" onSave={savePay}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Customer / project" value={pay.account} onChange={setP("account")} options={list.map(label)} />
          {payTarget && pc && (
            <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">
              {payTarget.mode ? <>Payment type: <span className="font-semibold text-foreground">{typeShort(payTarget.mode)}</span> · </> : <span className="text-amber-700">Payment plan set nahi hai. · </span>}
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
      <SideSheet open={planOpen} onOpenChange={setPlanOpen} title="Payment plan" description="Pehle batao customer kaise payment karega. Uske hisaab se schedule apne aap ban jayega." error={planError} saveLabel="Save plan" onSave={savePlan}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Project / customer" value={plan.account} onChange={setPl("account")} options={list.map(label)} />
          <TextField className="sm:col-span-2" label="Project value (₹)" type="number" min={0} value={plan.total} onChange={setPl("total")} />

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Payment type</p>
            <div role="radiogroup" aria-label="Payment type" className="grid gap-2 sm:grid-cols-2">
              {PLAN_TYPES.map((p) => {
                const on = plan.type === p.key;
                return (
                  <button key={p.key} type="button" role="radio" aria-checked={on} onClick={() => setPl("type")(p.key)}
                    className={`rounded-xl border p-3 text-left transition ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className={`mt-0.5 text-xs ${on ? "text-slate-300" : "text-muted-foreground"}`}>{p.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {t !== "Cash" && <TextField label="Advance (₹)" type="number" min={0} value={plan.advance} onChange={setPl("advance")} />}
          <TextField className={t === "Cash" ? "sm:col-span-2" : ""} label={t === "Cash" ? "Payment due date" : "Pehli due date"} type="date" value={plan.first} onChange={setPl("first")} />
          {t === "Kisht" && <TextField label="Kitni kisht (monthly)" type="number" min={2} value={plan.count} onChange={setPl("count")} />}
          {t === "Finance" && (
            <>
              <TextField label="Loan amount (₹)" type="number" min={0} value={plan.loan} onChange={setPl("loan")} />
              <TextField label="Bank / finance company" value={plan.provider} onChange={setPl("provider")} placeholder="e.g. SBI Rooftop Solar Loan" />
              <TextField label="Application number (optional)" value={plan.appNo} onChange={setPl("appNo")} />
            </>
          )}
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
            <p className="mt-2 text-sm text-muted-foreground">Customer ko dena hai: <span className="font-semibold text-foreground">{inr(planTotal - loan)}</span></p>
          </div>
        )}
      </SideSheet>

      {/* ---------- Detail ---------- */}
      {view && (() => {
        const c = calc(view);
        const loanTotal = c.loanPaid + c.loanDue;
        const advItem = c.ms.find((m) => m.label === "Advance");
        const modes = Array.from(new Set(view.payments.map((p) => p.mode))).join(", ");
        return (
          <DetailDialog wide open onOpenChange={() => setViewId(null)} title={view.customer} description={`${view.project} · ${view.phone}`}
            footer={<>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => openPlan(view)}><Settings2 /> {view.mode ? "Edit plan" : "Set plan"}</Button>
              <Button size="lg" className={darkBtn} disabled={c.outstanding <= 0} onClick={() => openPay(view)}><IndianRupee /> Record payment</Button>
            </>}>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <KV label="Order value">{inr(view.total)}</KV>
                <KV label="Received">{inr(c.received)}</KV>
                <KV label="Outstanding"><span className={c.status === "Overdue" ? "text-red-600" : ""}>{inr(c.outstanding)}</span></KV>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-semibold">Payment plan</p>
                  {view.mode ? <StatusBadge tone={typeTone[view.mode]}>{PLAN_TYPES.find((p) => p.key === view.mode)?.label}</StatusBadge> : <StatusBadge tone="slate">Not set</StatusBadge>}
                </div>
                {view.mode ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KV label="Advance">{advItem ? inr(advItem.amt) : "—"}</KV>
                    <KV label="Loan / finance">{loanTotal ? inr(loanTotal) : "—"}</KV>
                    <KV label="Customer contribution">{inr(view.total - loanTotal)}</KV>
                    <KV label="Customer se baaki">{inr(c.outstanding - c.loanDue)}</KV>
                    <KV label="Plan detail">{planDetail(view)}</KV>
                    <KV label="Modes used">{modes || "—"}</KV>
                  </div>
                ) : <p className="text-muted-foreground">Payment type set nahi hai (cash, milestones, kisht ya finance). “Set plan” dabao.</p>}
              </div>

              {view.loan && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="font-semibold">{view.loan.provider}</p><p className="text-sm text-muted-foreground">Loan {inr(loanTotal)} · Aaya {inr(c.loanPaid)} · Baaki {inr(c.loanDue)}</p></div>
                    {view.loan.status === "Disbursed"
                      ? <StatusBadge tone="green">Disbursed</StatusBadge>
                      : <SelectField label="" value={view.loan.status} onChange={(v) => setLoanField(view.id, { status: v })} options={LOAN_STATUS} />}
                  </div>
                  {view.loan.appNo && <p className="mt-2 text-sm text-muted-foreground">Application number: {view.loan.appNo}</p>}
                  {view.loan.status !== "Disbursed" && <p className="mt-2 text-xs text-muted-foreground">Loan amount “Received” me tabhi judega jab “Loan disbursement” record hoga.</p>}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">Installments</p>
                {c.ms.length === 0 ? <p className="text-muted-foreground">Plan set nahi hai, isliye schedule nahi bana.</p> : (
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
          </DetailDialog>
        );
      })()}
    </div>
  );
}