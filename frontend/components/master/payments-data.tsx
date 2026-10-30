"use client";

// Shared by "Payments & Outstanding" and "Payment Plans & Finance".
// Path suggestion: components/master/payments-data.ts
import { useSyncExternalStore } from "react";
import { d } from "@/components/master/module-kit";
import type { Tone } from "@/components/ui/page-layout";

export const PLAN_TYPES = ["Full payment", "Advance + milestones", "EMI / Kisht"];
export const PLAN_MODES = ["Cash", "UPI", "Bank transfer", "Cheque", "Finance / Loan"];
export const FIN_STATUS = ["Applied", "Approved", "Disbursed", "Rejected"];

export type Source = "Customer" | "Finance";
export type Item = { label: string; amt: number; due: string; source: Source };
export type Pay = { id: number; date: string; amount: number; mode: string; ref: string; source: Source };
export type Finance = { provider: string; appNo: string; requested: number; approved: number; status: string };
export type Account = {
  id: number; project: string; customer: string; phone: string; total: number;
  planType: string | null; planMode: string;
  schedule: Item[]; payments: Pay[]; finance?: Finance;
};

export const statusTone: Record<string, Tone> = { Overdue: "red", Partial: "amber", Pending: "slate", Paid: "green" };
export const finTone: Record<string, Tone> = { Applied: "slate", Approved: "amber", Disbursed: "green", Rejected: "red" };

export const label = (a: Account) => `${a.project} · ${a.customer}`;

/* ---------- date helper (noon avoids timezone day-shift) ---------- */
export const addDays = (iso: string, n: number) => {
  const x = new Date(`${iso}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

/* ---------- seed data ---------- */
const c = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Customer" });
const f = (label: string, amt: number, due: string): Item => ({ label, amt, due, source: "Finance" });
const pay = (id: number, date: string, amount: number, mode: string, ref: string, source: Source = "Customer"): Pay => ({ id, date, amount, mode, ref, source });

const SEED: Account[] = [
  {
    id: 1, project: "PRJ-101", customer: "Vikas Jain", phone: "98370 66418", total: 286000,
    planType: "Advance + milestones", planMode: "UPI",
    schedule: [c("Advance", 85800, d(-30)), c("Material dispatch", 143000, d(-10)), c("Commissioning", 57200, d(-2))],
    payments: [pay(11, d(-30), 85800, "UPI", "UTR 4021…88"), pay(12, d(-12), 64200, "Bank transfer", "NEFT 7731…20")],
  },
  {
    // Real example: ₹2,94,000 = ₹50,000 advance (UPI) + ₹2,00,000 loan + ₹44,000 customer contribution
    id: 2, project: "PRJ-104", customer: "Anil Gupta", phone: "98765 43210", total: 294000,
    planType: "Advance + milestones", planMode: "Finance / Loan",
    schedule: [c("Advance", 50000, d(-3)), f("Finance disbursement", 200000, d(10)), c("Final contribution", 44000, d(25))],
    payments: [pay(21, d(-3), 50000, "UPI", "UTR 9912…45")],
    finance: { provider: "SBI Rooftop Solar Loan", appNo: "SBI-SL-48213", requested: 200000, approved: 200000, status: "Approved" },
  },
  {
    id: 3, project: "PRJ-102", customer: "Hotel Taj View", phone: "99270 41122", total: 540000,
    planType: "Advance + milestones", planMode: "Bank transfer",
    schedule: [c("Advance", 162000, d(-20)), c("Material dispatch", 270000, d(-8)), c("Commissioning", 108000, d(7))],
    payments: [pay(31, d(-20), 162000, "Cheque", "Chq 004512"), pay(32, d(-8), 270000, "Bank transfer", "RTGS 5520…19")],
  },
  {
    id: 4, project: "PRJ-103", customer: "Meena Traders", phone: "99112 20345", total: 640000,
    planType: "EMI / Kisht", planMode: "Cheque",
    schedule: [
      c("Down payment", 160000, d(2)),
      ...[1, 2, 3, 4, 5, 6].map((i) => c(`EMI ${i}/6`, 80000, d(30 * i))),
    ],
    payments: [],
  },
  {
    id: 5, project: "PRJ-099", customer: "Sunil Yadav", phone: "97206 11890", total: 330000,
    planType: "Full payment", planMode: "Bank transfer",
    schedule: [c("Full payment", 330000, d(-20))],
    payments: [pay(51, d(-20), 330000, "Bank transfer", "RTGS 3318…07")],
  },
  {
    id: 6, project: "PRJ-105", customer: "Rajesh Sharma", phone: "98971 55320", total: 180000,
    planType: null, planMode: "",
    schedule: [], payments: [],
  },
];

/* ---------- tiny shared store so both pages stay in sync ---------- */
let store: Account[] = SEED;
const subs = new Set<() => void>();
export const updateAccounts = (fn: (p: Account[]) => Account[]) => { store = fn(store); subs.forEach((s) => s()); };
export const useAccounts = () =>
  useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => store,
    () => SEED,
  );

/* ---------- calculations ---------- */
export const itemStatus = (m: { paid: number; amt: number; due: string }) =>
  m.paid >= m.amt ? "Paid" : m.due < d(0) ? "Overdue" : m.paid > 0 ? "Partial" : "Pending";

export const calc = (a: Account) => {
  const received = a.payments.reduce((s, p) => s + p.amount, 0);
  // Customer payments fill customer items; finance disbursements fill finance items.
  const pool: Record<Source, number> = { Customer: 0, Finance: 0 };
  a.payments.forEach((p) => { pool[p.source] += p.amount; });
  const ms = a.schedule.map((m) => { const paid = Math.min(pool[m.source], m.amt); pool[m.source] -= paid; return { ...m, paid }; });
  const next = ms.find((m) => m.paid < m.amt);
  const outstanding = a.total - received;
  const finDue = ms.filter((m) => m.source === "Finance").reduce((s, m) => s + (m.amt - m.paid), 0);
  const finTotal = ms.filter((m) => m.source === "Finance").reduce((s, m) => s + m.amt, 0);
  const finPaid = finTotal - finDue;
  const overdueAmt = ms.filter((m) => m.due < d(0)).reduce((s, m) => s + (m.amt - m.paid), 0);
  const overdueCount = ms.filter((m) => m.paid < m.amt && m.due < d(0)).length;
  const paidCount = ms.filter((m) => m.paid >= m.amt).length;
  const status = outstanding <= 0 ? "Paid" : next && next.due < d(0) ? "Overdue" : received > 0 ? "Partial" : "Pending";
  return { received, outstanding, ms, next, overdueAmt, overdueCount, paidCount, finDue, finTotal, finPaid, status };
};

/* ---------- schedule builder for a new / changed plan ---------- */
export type PlanInput = { type: string; mode: string; adv: number; fin: number; count: number; first: string };

export const buildSchedule = (total: number, o: PlanInput): Item[] => {
  const fin = o.mode === "Finance / Loan" ? o.fin : 0;
  if (o.type === "Full payment" && fin === 0) return [c("Full payment", total, o.first)];

  const items: Item[] = [];
  if (o.adv > 0) items.push(c(o.type === "EMI / Kisht" ? "Down payment" : "Advance", o.adv, o.first));
  if (fin > 0) items.push(f("Finance disbursement", fin, addDays(o.first, 15)));

  const rest = total - o.adv - fin;
  if (rest > 0) {
    if (o.type === "EMI / Kisht") {
      const n = Math.max(2, o.count);
      const each = Math.floor(rest / n);
      for (let i = 1; i <= n; i++) items.push(c(`EMI ${i}/${n}`, i === n ? rest - each * (n - 1) : each, addDays(o.first, 30 * i)));
    } else if (fin > 0 || o.type === "Full payment") {
      items.push(c("Final contribution", rest, addDays(o.first, 30)));
    } else {
      const m = Math.round(rest * 0.7);
      items.push(c("Material dispatch", m, addDays(o.first, 15)), c("Commissioning", rest - m, addDays(o.first, 30)));
    }
  }
  return items;
};