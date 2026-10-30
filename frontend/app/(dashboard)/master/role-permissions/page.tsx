"use client";

import { useState } from "react";
import { Check, Eye, Lock, ShieldCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, ViewDialog } from "@/components/ui/page-layout";

const card = "rounded-2xl border border-slate-200 bg-white shadow-none";
const darkBtn = "h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800 disabled:opacity-50";
const MODULES = ["Employees", "Customers", "Leads", "Quotations", "Inventory", "Purchases", "Installations", "Payments", "Expenses", "Reports", "Masters"];
const ACTIONS = ["View", "Create", "Edit", "Delete"];
const mk = (spec: Record<string, string>) =>
  Object.fromEntries(MODULES.map((m) => [m, ACTIONS.map((a) => (spec[m] ?? "").includes(a[0]))])) as Record<string, boolean[]>;

type Role = { name: string; desc: string; users: number; locked?: boolean; perms: Record<string, boolean[]> };
const SEED: Role[] = [
  { name: "Admin", desc: "Full access to every module", users: 1, locked: true, perms: mk(Object.fromEntries(MODULES.map((m) => [m, "VCED"]))) },
  { name: "Sales", desc: "Leads, customers and quotations", users: 4, perms: mk({ Customers: "VCE", Leads: "VCE", Quotations: "VCE", Installations: "V", Payments: "V" }) },
  { name: "Accounts", desc: "Payments, purchases and expenses", users: 2, perms: mk({ Customers: "V", Quotations: "V", Purchases: "VCE", Payments: "VCE", Expenses: "VCE", Reports: "V" }) },
  { name: "Installation team", desc: "Site work and stock usage", users: 5, perms: mk({ Customers: "V", Inventory: "V", Installations: "VE", Expenses: "VC" }) },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(SEED);
  const [sel, setSel] = useState(1);
  const [saved, setSaved] = useState(true);
  const [viewModule, setViewModule] = useState<string | null>(null);
  const role = roles[sel];

  const update = (fn: (p: Record<string, boolean[]>) => Record<string, boolean[]>) => {
    if (role.locked) return;
    setRoles((rs) => rs.map((r, i) => (i === sel ? { ...r, perms: fn(r.perms) } : r)));
    setSaved(false);
  };
  const toggle = (m: string, i: number) => update((p) => ({ ...p, [m]: p[m].map((v, j) => (j === i ? !v : v)) }));
  const toggleRow = (m: string) => update((p) => ({ ...p, [m]: p[m].map(() => !p[m].every(Boolean)) }));
  const count = (r: Role) => Object.values(r.perms).flat().filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 px-4 py-3`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & permissions</h1>
          <p className="mt-1 text-muted-foreground">Access control for Admin, Sales, Accounts and Installation team.</p>
        </div>
        <Button size="lg" className={darkBtn} disabled={saved} onClick={() => setSaved(true)}>
          <Check /> {saved ? "Saved" : "Save changes"}
        </Button>
      </div>

      <div className="grid gap-2 lg:grid-cols-[280px_1fr]">
        <div className={`${card} space-y-2 p-3`}>
          {roles.map((r, i) => (
            <button key={r.name} onClick={() => setSel(i)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${i === sel ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${i === sel ? "bg-white/15" : "bg-indigo-50 text-indigo-600"}`}>
                {r.locked ? <Lock size={18} /> : <ShieldCheck size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{r.name}</span>
                <span className={`flex items-center gap-1 text-xs ${i === sel ? "text-white/70" : "text-muted-foreground"}`}><Users size={12} /> {r.users} users · {count(r)} permissions</span>
              </span>
            </button>
          ))}
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-slate-200 p-4">
            <p className="text-lg font-bold">{role.name}</p>
            <p className="text-sm text-muted-foreground">{role.locked ? "Admin permissions are locked." : role.desc}</p>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 px-4 text-sm font-medium text-slate-900">Module</TableHead>
                {ACTIONS.map((a) => <TableHead key={a} className="h-12 px-4 text-center text-sm font-medium text-slate-900">{a}</TableHead>)}
                <TableHead className="h-12 px-4 text-center text-sm font-medium text-slate-900">All</TableHead>
                <TableHead className="h-12 px-4 text-right text-sm font-medium text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map((m) => (
                <TableRow key={m}>
                  <TableCell className="px-4 py-3 text-sm font-semibold">{m}</TableCell>
                  {role.perms[m].map((v, i) => (
                    <TableCell key={i} className="px-4 text-center">
                      <input type="checkbox" aria-label={`${m} ${ACTIONS[i]}`} className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed" checked={v} disabled={role.locked} onChange={() => toggle(m, i)} />
                    </TableCell>
                  ))}
                  <TableCell className="px-4 text-center">
                    <input type="checkbox" aria-label={`${m} all`} className="h-4 w-4 cursor-pointer accent-slate-950 disabled:cursor-not-allowed" checked={role.perms[m].every(Boolean)} disabled={role.locked} onChange={() => toggleRow(m)} />
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button variant="ghost" size="icon" aria-label={`View ${m} permissions`} title="View details" className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600" onClick={() => setViewModule(m)}><Eye /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ViewDialog
        open={Boolean(viewModule)}
        onOpenChange={(open) => { if (!open) setViewModule(null); }}
        title={viewModule ? `${viewModule} permissions` : "Permission details"}
        description="Role access overview for this module."
        size="sm:max-w-2xl"
        footer={<div className="flex w-full items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400">{role.locked ? "System role · Locked" : "Custom role"}</p>
          <Button variant="outline" className="h-9 rounded-lg border-slate-200 px-3 text-xs" onClick={() => setViewModule(null)}>Close</Button>
        </div>}
      >
        {viewModule && <div className="space-y-4 py-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/70 p-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><ShieldCheck size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{role.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{role.desc}</p>
            </div>
            <StatusBadge tone={role.locked ? "slate" : "indigo"}>{role.locked ? "Locked" : "Custom role"}</StatusBadge>
          </div>
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{viewModule} access</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ACTIONS.map((action, i) => {
                const allowed = role.perms[viewModule][i];
                return <div key={action} className="flex items-center justify-between rounded-lg bg-slate-50/70 p-2.5">
                  <span className="text-xs font-medium text-slate-700">{action}</span>
                  <StatusBadge tone={allowed ? "green" : "slate"}>{allowed ? <><Check size={12} className="mr-1 inline" />Allowed</> : <><X size={12} className="mr-1 inline" />Not allowed</>}</StatusBadge>
                </div>;
              })}
            </div>
          </section>
        </div>}
      </ViewDialog>
    </div>
  );
}
