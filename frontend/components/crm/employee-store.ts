"use client";

import { useEffect, useState } from "react";
import { d } from "@/components/master/module-kit";

export const ME = "Sumit Saxena";
export const DEPTS = ["Sales", "Installation", "Service", "Accounts", "Admin", "HR"];
export const EMP_TYPES = ["Full-time", "Contract", "Intern"];
export const RELATIONS = ["Father", "Mother", "Spouse", "Brother", "Sister", "Friend", "Other"];
export const STATES = ["Uttar Pradesh", "Delhi", "Haryana", "Rajasthan", "Uttarakhand", "Madhya Pradesh", "Other"];

/** Documents every employee must have. HR can add more per employee (the "+ Add document" to-do). */
export const BASE_DOCS = ["Aadhaar card", "PAN card", "Passport photo", "Address proof", "Bank passbook / cancelled cheque", "Offer / appointment letter"];

export type Addr = { line: string; city: string; state: string; pincode: string };
export type EmpDoc = { type: string; file: string; status: "Pending" | "Verified" | "Rejected"; on: string; by: string };
export type Activity = { title: string; meta: string };
export type Employee = {
  id: number; code: string; name: string; phone: string; email: string; dob: string;
  dept: string; designation: string; empType: string; joinDate: string; status: "Active" | "Inactive";
  current: Addr; permanent: Addr; sameAddr: boolean;
  emergencyName: string; emergencyRelation: string; emergencyPhone: string;
  docs: EmpDoc[]; customDocs: string[];
  createdOn: string; updatedOn: string; updatedBy: string; activity: Activity[];
};
export type EStore = { employees: Employee[] };

/* ---------- derived ---------- */
export const emptyAddr = (): Addr => ({ line: "", city: "", state: "Uttar Pradesh", pincode: "" });
export const requiredDocs = (e: Employee) => [...BASE_DOCS, ...e.customDocs];
export const docState = (e: Employee) => {
  const req = requiredDocs(e), have = e.docs.filter((x) => req.includes(x.type));
  const missing = req.length - have.length, rejected = have.filter((x) => x.status === "Rejected").length, pending = have.filter((x) => x.status === "Pending").length;
  const status = missing > 0 ? "Missing documents" : rejected > 0 ? "Re-upload needed" : pending > 0 ? "Pending verification" : "Verified";
  return { have: have.length, total: req.length, missing, rejected, pending, status };
};
export const addrOf = (e: Employee, which: "current" | "permanent") => (which === "permanent" && e.sameAddr ? e.current : e[which]);
export const addrDone = (a: Addr) => !!(a.line.trim() && a.city.trim() && a.pincode.replace(/\D/g, "").length === 6);
export const addrText = (a: Addr) => [a.line, a.city, a.state, a.pincode].filter(Boolean).join(", ");
export const addrComplete = (e: Employee) => addrDone(e.current) && addrDone(addrOf(e, "permanent"));

export const withDoc = (e: Employee, type: string, doc: EmpDoc | null, note: string): Employee => ({
  ...e, docs: doc ? [...e.docs.filter((x) => x.type !== type), doc] : e.docs, updatedOn: d(0), updatedBy: ME,
  activity: [{ title: note, meta: `Today · ${ME}` }, ...e.activity],
});

/* ---------- seed ---------- */
const doc = (type: string, file: string, status: EmpDoc["status"], ago = 20): EmpDoc => ({ type, file, status, on: d(-ago), by: ME });
const base = { email: "", dob: "", status: "Active" as const, empType: "Full-time", sameAddr: true, current: emptyAddr(), permanent: emptyAddr(), emergencyName: "", emergencyRelation: "Father", emergencyPhone: "", docs: [] as EmpDoc[], customDocs: [] as string[], createdOn: d(-60), updatedOn: d(-5), updatedBy: ME, activity: [] as Activity[] };

const SEED: EStore = {
  employees: [
    { ...base, id: 1, code: "EMP-001", name: "Rohit Sharma", phone: "98370 11223", email: "rohit@example.com", dept: "Sales", designation: "Sales Manager", joinDate: d(-400), dob: "1992-04-12",
      current: { line: "21, Shahganj Road", city: "Agra", state: "Uttar Pradesh", pincode: "282010" }, emergencyName: "Mahesh Sharma", emergencyPhone: "98370 99887",
      docs: BASE_DOCS.map((t) => doc(t, `${t.split(" ")[0].toLowerCase()}.pdf`, "Verified", 300)),
      activity: [{ title: "All documents verified", meta: "10 months ago · Sumit Saxena" }] },
    { ...base, id: 2, code: "EMP-002", name: "Imran Khan", phone: "99270 55410", dept: "Installation", designation: "Site Engineer", joinDate: d(-200),
      current: { line: "8, Kamla Nagar", city: "Agra", state: "Uttar Pradesh", pincode: "282005" }, sameAddr: false,
      permanent: { line: "Village Sikandarpur", city: "Muzaffarnagar", state: "Uttar Pradesh", pincode: "251001" },
      emergencyName: "Shabana Khan", emergencyRelation: "Spouse", emergencyPhone: "99270 12345",
      docs: [doc("Aadhaar card", "aadhaar.jpg", "Verified", 190), doc("PAN card", "pan.pdf", "Verified", 190), doc("Passport photo", "photo.jpg", "Verified", 190), doc("Address proof", "proof.pdf", "Rejected", 5)],
      customDocs: ["Safety training certificate"], activity: [{ title: "Address proof rejected: blurry scan", meta: "5 days ago · Sumit Saxena" }] },
    { ...base, id: 3, code: "EMP-003", name: "Neha Verma", phone: "88100 33445", dept: "Service", designation: "Service Coordinator", joinDate: d(-90),
      current: { line: "Firozabad Road", city: "Firozabad", state: "Uttar Pradesh", pincode: "283203" },
      docs: [doc("Aadhaar card", "aadhaar.pdf", "Pending", 3), doc("PAN card", "pan.pdf", "Pending", 3)] },
    { ...base, id: 4, code: "EMP-004", name: "Priya Singh", phone: "97206 78901", dept: "Accounts", designation: "Accountant", empType: "Contract", joinDate: d(-10), docs: [] },
  ],
};

/* ---------- shared store (localStorage) ---------- */
let state: EStore = SEED;
let hydrated = false;
const subs = new Set<() => void>();
export const blobs = new Map<string, string>();

// Older saved records may not have all fields added by newer versions of the form.
// Fill those fields during hydration so the page and its derived helpers can safely
// read nested address and document data.
const normalizeEmployee = (value: Partial<Employee>, index: number): Employee => ({
  id: Number(value.id) || Date.now() + index,
  code: value.code ?? `EMP-${String(index + 1).padStart(3, "0")}`,
  name: value.name ?? "", phone: value.phone ?? "", email: value.email ?? "", dob: value.dob ?? "",
  dept: value.dept ?? "Sales", designation: value.designation ?? "", empType: value.empType ?? "Full-time",
  joinDate: value.joinDate ?? "", status: value.status === "Inactive" ? "Inactive" : "Active",
  current: { ...emptyAddr(), ...(value.current ?? {}) },
  permanent: { ...emptyAddr(), ...(value.permanent ?? {}) }, sameAddr: value.sameAddr ?? true,
  emergencyName: value.emergencyName ?? "", emergencyRelation: value.emergencyRelation ?? "Father", emergencyPhone: value.emergencyPhone ?? "",
  docs: Array.isArray(value.docs) ? value.docs : [], customDocs: Array.isArray(value.customDocs) ? value.customDocs : [],
  createdOn: value.createdOn ?? "", updatedOn: value.updatedOn ?? "", updatedBy: value.updatedBy ?? ME,
  activity: Array.isArray(value.activity) ? value.activity : [],
});

export function useEmployees(): [EStore, (fn: (s: EStore) => EStore) => void] {
  const [, force] = useState(0);
  useEffect(() => {
    if (!hydrated) {
      hydrated = true;
      try {
        const raw = localStorage.getItem("employee-store-v1");
        if (raw) {
          const saved = JSON.parse(raw) as Partial<EStore>;
          state = {
            ...SEED,
            ...saved,
            employees: Array.isArray(saved.employees) ? saved.employees.map(normalizeEmployee) : SEED.employees,
          };
          subs.forEach((f) => f());
        }
      } catch { /* ignore */ }
    }
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const update = (fn: (s: EStore) => EStore) => {
    state = fn(state);
    try { localStorage.setItem("employee-store-v1", JSON.stringify(state)); } catch { /* ignore */ }
    subs.forEach((f) => f());
  };
  return [state, update];
}
