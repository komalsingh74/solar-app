"use client";

import { useEffect, useState } from "react";
import { d } from "@/components/master/module-kit";

/* ---------- types ---------- */
export type Employee = {
  id: number; code: string; name: string; phone: string; email: string; dept: string; designation: string; type: string; joined: string; status: string;
  reportsTo: string; shift: string; role: string; structure: string; gross: number; pan: string; uan: string; bank: string; accNo: string; ifsc: string;
  licenceExpiry: string; safetyExpiry: string;
};
export type Structure = { id: number; name: string; basic: number; hra: number; conv: number; pf: boolean; esi: boolean };
export type Shift = { id: number; name: string; start: string; end: string; offDay: string; grace: number };
export type Leave = { id: number; empId: number; type: string; from: string; to: string; days: number; reason: string; status: string };
export type Advance = { id: number; empId: number; amount: number; date: string; reason: string; emi: number; recovered: number };
export type Deduction = { id: number; empId: number; month: string; type: string; amount: number; note: string };
export type Crew = { id: number; name: string; lead: number; members: number[]; vehicle: string; skills: string; status: string; project: string; kwMonth: number; rate: number };
export type Settings = {
  company: string; pfOn: boolean; pfRate: number; pfCeilingOn: boolean; pfCeiling: number; esiOn: boolean; esiRate: number; esiEmployerRate: number; esiLimit: number;
  ptOn: boolean; ptAmount: number; ptAbove: number; tdsOn: boolean; pfNo: string; esiNo: string; tan: string; pan: string;
};
export type Slip = {
  empId: number; code: string; name: string; dept: string; designation: string; bank: string; accNo: string; ifsc: string; month: string;
  days: number; lop: number; paidDays: number; gross: number; basic: number; hra: number; conv: number; special: number; earned: number; incentive: number;
  pf: number; esi: number; pt: number; advance: number; other: number; ded: number; net: number; erPf: number; erEsi: number;
};
export type PayrollRun = { locked: boolean; incentives: Record<number, number>; slips: Slip[]; on: string };
export type Store = {
  employees: Employee[]; structures: Structure[]; shifts: Shift[]; leaves: Leave[]; advances: Advance[]; deductions: Deduction[]; crews: Crew[];
  settings: Settings; att: Record<string, string>; payroll: Record<string, PayrollRun>;
};

/* ---------- constants ---------- */
export const DEPTS = ["Admin", "Sales", "Accounts", "Installation", "Store"];
export const ROLES = ["Admin", "Sales", "Accounts", "Installation team"];
export const EMP_TYPES = ["Full-time", "Contract", "Daily wage"];
export const LEAVE_QUOTA: Record<string, number> = { Casual: 12, Sick: 8, Earned: 15 };

/* ---------- date helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (offset = 0) => {
  const [y, m] = d(0).slice(0, 7).split("-").map(Number);
  const x = new Date(y, m - 1 + offset, 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
};
export const monthLabel = (k: string) => new Date(k + "-01T00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
export const daysIn = (k: string) => new Date(Number(k.slice(0, 4)), Number(k.slice(5)), 0).getDate();
export const isSunday = (date: string) => new Date(date + "T00:00").getDay() === 0;
export const rangeDates = (from: string, to: string) => {
  const out: string[] = []; if (!from || !to || to < from) return out;
  for (let t = new Date(from + "T00:00"); t <= new Date(to + "T00:00") && out.length < 120; t.setDate(t.getDate() + 1)) out.push(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
  return out;
};
export const certState = (date: string) => (!date ? "—" : date < d(0) ? "Expired" : date < d(30) ? "Expiring" : "Valid");

/* ---------- attendance ---------- */
export const attOf = (s: Store, e: Employee, date: string): string => {
  if (date > d(0) || date < e.joined) return "";
  const o = s.att[`${date}|${e.id}`]; if (o) return o;
  if (date === d(0)) return "";
  if (isSunday(date)) return "W";
  const h = (e.id * 7 + Number(date.slice(8)) * 13) % 23;
  return h === 0 ? "A" : h === 1 ? "H" : h === 2 ? "L" : "P";
};
export const monthAtt = (s: Store, e: Employee, month: string): { P: number; A: number; H: number; L: number; U: number; W: number; lop: number } => {
  const c: Record<string, number> = { P: 0, A: 0, H: 0, L: 0, U: 0, W: 0 };
  for (let i = 1; i <= daysIn(month); i++) { const a = attOf(s, e, `${month}-${pad(i)}`); if (a) c[a]++; }
  return { P: c.P, A: c.A, H: c.H, L: c.L, U: c.U, W: c.W, lop: c.A + c.U + c.H * 0.5 };
};

/* ---------- payroll ---------- */
export const suggestedIncentive = (s: Store, e: Employee) => {
  const c = s.crews.find((x) => x.members.includes(e.id));
  return c && e.dept === "Installation" && c.members.length ? Math.round((c.kwMonth * c.rate) / c.members.length) : 0;
};
export const advanceDue = (a: Advance) => Math.max(0, Math.min(a.emi, a.amount - a.recovered));

export const calcSlip = (s: Store, e: Employee, month: string, incentive = 0, lopOverride?: number): Slip => {
  const st = s.settings, days = daysIn(month);
  const str = s.structures.find((x) => x.name === e.structure) ?? s.structures[0];
  const lop = lopOverride ?? monthAtt(s, e, month).lop, ratio = (days - lop) / days;
  const basicF = (e.gross * str.basic) / 100, hraF = (e.gross * str.hra) / 100, convF = str.conv, specF = Math.max(0, e.gross - basicF - hraF - convF);
  const basic = Math.round(basicF * ratio), hra = Math.round(hraF * ratio), conv = Math.round(convF * ratio), special = Math.round(specF * ratio);
  const earned = basic + hra + conv + special;
  const pfBase = st.pfCeilingOn ? Math.min(basic, st.pfCeiling) : basic;
  const pf = st.pfOn && str.pf ? Math.round((pfBase * st.pfRate) / 100) : 0;
  const esiOn = st.esiOn && str.esi && e.gross <= st.esiLimit;
  const esi = esiOn ? Math.ceil((earned * st.esiRate) / 100) : 0;
  const pt = st.ptOn && earned >= st.ptAbove ? st.ptAmount : 0;
  const advance = s.advances.filter((a) => a.empId === e.id && a.date <= `${month}-31`).reduce((t, a) => t + advanceDue(a), 0);
  const other = s.deductions.filter((x) => x.empId === e.id && x.month === month).reduce((t, x) => t + x.amount, 0);
  const ded = pf + esi + pt + advance + other;
  return {
    empId: e.id, code: e.code, name: e.name, dept: e.dept, designation: e.designation, bank: e.bank, accNo: e.accNo, ifsc: e.ifsc, month, days, lop, paidDays: days - lop,
    gross: e.gross, basic, hra, conv, special, earned, incentive, pf, esi, pt, advance, other, ded, net: earned + incentive - ded,
    erPf: st.pfOn && str.pf ? Math.round((pfBase * st.pfRate) / 100) : 0, erEsi: esiOn ? Math.ceil((earned * st.esiEmployerRate) / 100) : 0,
  };
};

/* ---------- seed ---------- */
const emp = (id: number, code: string, name: string, phone: string, dept: string, designation: string, gross: number, structure: string, shift: string, role: string, bank: string, reportsTo: string, joined: string, licence = "", safety = ""): Employee =>
  ({ id, code, name, phone, email: `${name.split(" ")[0].toLowerCase()}@example.com`, dept, designation, type: "Full-time", joined, status: "Active", reportsTo, shift, role, structure, gross, pan: "ABCDE1234F", uan: "1012345678" + id, bank, accNo: `5010000000${id}234`, ifsc: "HDFC0001234", licenceExpiry: licence, safetyExpiry: safety });

const SEED: Store = {
  employees: [
    emp(1, "EMP-001", "Sumit Saxena", "98370 00000", "Admin", "Director", 80000, "Management", "General", "Admin", "HDFC Bank", "", "2023-04-01"),
    emp(2, "EMP-002", "Rohit Sharma", "98370 11223", "Sales", "Sales executive", 28000, "Staff", "General", "Sales", "SBI", "Sumit Saxena", "2025-04-01"),
    emp(3, "EMP-003", "Neha Verma", "99270 55410", "Sales", "Sales coordinator", 24000, "Staff", "General", "Sales", "ICICI Bank", "Sumit Saxena", "2025-01-10"),
    emp(4, "EMP-004", "Imran Khan", "98100 77821", "Installation", "Installation lead", 32000, "Field", "Site", "Installation team", "SBI", "Sumit Saxena", "2024-11-15", d(120), d(20)),
    emp(5, "EMP-005", "Ajay Kumar", "97200 33412", "Installation", "Technician", 18000, "Field", "Site", "Installation team", "PNB", "Imran Khan", "2025-06-02", d(300), d(-10)),
    emp(6, "EMP-006", "Deepak Yadav", "88100 22341", "Installation", "Helper", 14000, "Field", "Site", "Installation team", "SBI", "Imran Khan", "2025-08-18", "", d(200)),
    emp(7, "EMP-007", "Suresh Pal", "94150 66120", "Installation", "Technician", 19000, "Field", "Site", "Installation team", "Bank of Baroda", "Imran Khan", "2025-03-05", d(45), d(150)),
    emp(8, "EMP-008", "Manoj Singh", "97600 90871", "Installation", "Helper", 13500, "Field", "Site", "Installation team", "SBI", "Imran Khan", "2025-09-01", "", d(90)),
    emp(9, "EMP-009", "Anita Gupta", "99000 12009", "Accounts", "Accountant", 26000, "Staff", "General", "Accounts", "HDFC Bank", "Sumit Saxena", "2024-07-01"),
  ],
  structures: [
    { id: 1, name: "Staff", basic: 50, hra: 20, conv: 1600, pf: true, esi: true },
    { id: 2, name: "Field", basic: 50, hra: 15, conv: 1250, pf: true, esi: true },
    { id: 3, name: "Management", basic: 40, hra: 20, conv: 1600, pf: false, esi: false },
  ],
  shifts: [
    { id: 1, name: "General", start: "09:30", end: "18:30", offDay: "Sunday", grace: 15 },
    { id: 2, name: "Site", start: "08:00", end: "17:00", offDay: "Sunday", grace: 10 },
    { id: 3, name: "Late", start: "10:30", end: "19:30", offDay: "Sunday", grace: 15 },
  ],
  leaves: [
    { id: 1, empId: 2, type: "Casual", from: d(2), to: d(3), days: 2, reason: "Family function", status: "Pending" },
    { id: 2, empId: 5, type: "Unpaid", from: d(5), to: d(5), days: 1, reason: "Village visit", status: "Pending" },
    { id: 3, empId: 3, type: "Sick", from: d(-9), to: d(-8), days: 2, reason: "Fever", status: "Approved" },
  ],
  advances: [
    { id: 1, empId: 5, amount: 10000, date: d(-70), reason: "Medical", emi: 2000, recovered: 4000 },
    { id: 2, empId: 6, amount: 5000, date: d(-20), reason: "Family need", emi: 1000, recovered: 0 },
    { id: 3, empId: 4, amount: 20000, date: d(-150), reason: "Bike repair", emi: 4000, recovered: 12000 },
  ],
  deductions: [{ id: 1, empId: 6, month: monthKey(-1), type: "Damage / loss", amount: 500, note: "Safety helmet lost on site" }],
  crews: [
    { id: 1, name: "Team A", lead: 4, members: [4, 5, 6], vehicle: "UP80 AB 1234", skills: "RCC rooftop, Net-metering", status: "On site", project: "PRJ-102 · Hotel Taj View", kwMonth: 22, rate: 400 },
    { id: 2, name: "Team B", lead: 7, members: [7, 8], vehicle: "UP80 CD 5678", skills: "Structure, Tin shed", status: "Available", project: "", kwMonth: 13, rate: 350 },
  ],
  settings: { company: "Vanshika Solar", pfOn: true, pfRate: 12, pfCeilingOn: true, pfCeiling: 15000, esiOn: true, esiRate: 0.75, esiEmployerRate: 3.25, esiLimit: 21000, ptOn: false, ptAmount: 200, ptAbove: 15000, tdsOn: false, pfNo: "UPAGR0000000", esiNo: "00000000000000000", tan: "MRTV00000A", pan: "ABCDE1234F" },
  att: {},
  payroll: {},
};

/* ---------- tiny shared store (persists in localStorage) ---------- */
let state: Store = SEED;
let hydrated = false;
const subs = new Set<() => void>();

export function useHr(): [Store, (fn: (s: Store) => Store) => void] {
  const [, force] = useState(0);
  useEffect(() => {
    if (!hydrated) {
      hydrated = true;
      try { const raw = localStorage.getItem("hr-store-v1"); if (raw) { state = { ...SEED, ...JSON.parse(raw) }; subs.forEach((f) => f()); } } catch { /* ignore */ }
    }
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const update = (fn: (s: Store) => Store) => {
    state = fn(state);
    try { localStorage.setItem("hr-store-v1", JSON.stringify(state)); } catch { /* ignore */ }
    subs.forEach((f) => f());
  };
  return [state, update];
}