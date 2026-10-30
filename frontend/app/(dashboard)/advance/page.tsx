"use client";

import { Avatar, PageHeader, Panel, StatCard, StatusBadge, SelectField, TextField } from "@/components/ui/page-layout";
import { SideSheet, d, darkBtn, fmtDate, inr, pillList, pillTrig, thCls } from "@/components/master/module-kit";
import { advanceDue, monthKey, monthLabel, useHr } from "@/components/hr/hr-store";

import { useState } from "react";
import { Banknote, MinusCircle, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DED_TYPES = ["Penalty", "Damage / loss", "Other"];

export default function AdvancesPage() {
  const [s, update] = useHr();
  const [tab, setTab] = useState("adv");
  const [open, setOpen] = useState(false);
  const [adv, setAdv] = useState({ emp: "", amount: "", date: d(0), reason: "", emi: "" });
  const [ded, setDed] = useState({ emp: "", month: monthKey(0), type: DED_TYPES[0], amount: "", note: "" });
  const active = s.employees.filter((e) => e.status === "Active");
  const name = (id: number) => s.employees.find((e) => e.id === id)?.name ?? "—";
  const person = (n: string) => s.employees.find((e) => e.name === n);

  const open_ = s.advances.filter((a) => a.amount - a.recovered > 0);
  const outstanding = open_.reduce((t, a) => t + (a.amount - a.recovered), 0);
  const emi = open_.reduce((t, a) => t + advanceDue(a), 0);

  const emp = person(adv.emp), amt = Number(adv.amount), em = Number(adv.emi);
  const advErr = !emp ? "Select an employee." : !(amt > 0) ? "Enter the advance amount." : emp && amt > emp.gross * 2 ? `Advance is more than 2× monthly salary (${inr(emp.gross * 2)}). Get owner approval.` : !(em > 0) ? "Enter monthly recovery (EMI)." : em > amt ? "EMI cannot exceed the advance." : "";
  const demp = person(ded.emp), damt = Number(ded.amount);
  const dedErr = !demp ? "Select an employee." : !(damt > 0) ? "Enter the amount." : !ded.note.trim() ? "Add a note so the employee can see why." : "";
  const error = tab === "adv" ? advErr : dedErr;

  const save = () => {
    if (error) return;
    if (tab === "adv" && emp) update((st) => ({ ...st, advances: [{ id: Date.now(), empId: emp.id, amount: amt, date: adv.date, reason: adv.reason, emi: em, recovered: 0 }, ...st.advances] }));
    if (tab === "ded" && demp) update((st) => ({ ...st, deductions: [{ id: Date.now(), empId: demp.id, month: ded.month, type: ded.type, amount: damt, note: ded.note }, ...st.deductions] }));
    setOpen(false);
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Advances & deductions" subtitle="Salary advances recovered by EMI, plus one-time deductions. Payroll picks both up automatically.">
        <Button size="lg" className={darkBtn} onClick={() => { setAdv({ emp: "", amount: "", date: d(0), reason: "", emi: "" }); setDed({ emp: "", month: monthKey(0), type: DED_TYPES[0], amount: "", note: "" }); setOpen(true); }}><Plus /> {tab === "adv" ? "Give advance" : "Add deduction"}</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Wallet size={24} />} value={inr(outstanding)} label="Advance outstanding" />
        <StatCard icon={<Banknote size={24} />} value={inr(emi)} label="Recovered next payroll" />
        <StatCard icon={<MinusCircle size={24} />} value={inr(s.deductions.filter((x) => x.month === monthKey(0)).reduce((t, x) => t + x.amount, 0))} label="Deductions this month" />
      </div>

      <Panel className="overflow-hidden">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="p-4"><TabsList className={pillList}><TabsTrigger value="adv" className={pillTrig}>Advances</TabsTrigger><TabsTrigger value="ded" className={pillTrig}>One-time deductions</TabsTrigger></TabsList></div>
        </Tabs>
        {tab === "adv" ? (
          <Table>
            <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Given", "Amount", "Monthly EMI", "Recovered", "Balance", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {s.advances.map((a) => { const bal = a.amount - a.recovered; return (
                <TableRow key={a.id}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={name(a.empId)} /><div><p className="font-semibold">{name(a.empId)}</p><p className="text-sm text-muted-foreground">{a.reason || "—"}</p></div></div></TableCell>
                  <TableCell className="px-4">{fmtDate(a.date)}</TableCell><TableCell className="px-4">{inr(a.amount)}</TableCell><TableCell className="px-4">{inr(a.emi)}</TableCell>
                  <TableCell className="px-4"><div className="h-2 w-24 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${(a.recovered / a.amount) * 100}%` }} /></div><p className="mt-1 text-sm text-muted-foreground">{inr(a.recovered)}</p></TableCell>
                  <TableCell className="px-4 font-semibold">{inr(bal)}</TableCell>
                  <TableCell className="px-4"><StatusBadge tone={bal > 0 ? "amber" : "green"}>{bal > 0 ? `${Math.ceil(bal / a.emi)} EMIs left` : "Cleared"}</StatusBadge></TableCell>
                </TableRow>
              ); })}
              {s.advances.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No advances given.</TableCell></TableRow>}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Month", "Type", "Amount", "Note"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {s.deductions.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="px-4 py-3 font-semibold">{name(x.empId)}</TableCell><TableCell className="px-4">{monthLabel(x.month)}</TableCell>
                  <TableCell className="px-4"><StatusBadge tone="amber">{x.type}</StatusBadge></TableCell><TableCell className="px-4 font-semibold">{inr(x.amount)}</TableCell><TableCell className="px-4 text-muted-foreground">{x.note}</TableCell>
                </TableRow>
              ))}
              {s.deductions.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No deductions.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Panel>

      <SideSheet open={open} onOpenChange={setOpen} title={tab === "adv" ? "Give advance" : "Add deduction"} description={tab === "adv" ? "EMI is recovered from salary each month until the balance is zero." : "Deducted once, in the month you choose."} error={error} saveLabel="Save" onSave={save}>
        {tab === "adv" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField className="sm:col-span-2" label="Employee" value={adv.emp} onChange={(v) => setAdv((x) => ({ ...x, emp: v }))} options={active.map((e) => e.name)} placeholder="Select employee" />
            <TextField label="Advance amount (₹)" type="number" min={0} value={adv.amount} onChange={(v) => setAdv((x) => ({ ...x, amount: v }))} />
            <TextField label="Monthly recovery / EMI (₹)" type="number" min={0} value={adv.emi} onChange={(v) => setAdv((x) => ({ ...x, emi: v }))} />
            <TextField label="Date given" type="date" value={adv.date} onChange={(v) => setAdv((x) => ({ ...x, date: v }))} />
            <TextField label="Reason" value={adv.reason} onChange={(v) => setAdv((x) => ({ ...x, reason: v }))} />
            {amt > 0 && em > 0 && <p className="text-sm sm:col-span-2">Will be recovered in <span className="font-semibold">{Math.ceil(amt / em)} months</span>.</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField className="sm:col-span-2" label="Employee" value={ded.emp} onChange={(v) => setDed((x) => ({ ...x, emp: v }))} options={active.map((e) => e.name)} placeholder="Select employee" />
            <SelectField label="Type" value={ded.type} onChange={(v) => setDed((x) => ({ ...x, type: v }))} options={DED_TYPES} />
            <SelectField label="Deduct in" value={ded.month} onChange={(v) => setDed((x) => ({ ...x, month: v }))} options={[monthKey(0), monthKey(-1)]} />
            <TextField label="Amount (₹)" type="number" min={0} value={ded.amount} onChange={(v) => setDed((x) => ({ ...x, amount: v }))} />
            <TextField label="Note" value={ded.note} onChange={(v) => setDed((x) => ({ ...x, note: v }))} placeholder="Reason shown on payslip" />
          </div>
        )}
      </SideSheet>
    </div>
  );
}