"use client";

import { Avatar, KV, PageHeader, Panel, StatCard, StatusBadge } from "@/components/ui/page-layout";
import { DetailDialog, d, darkBtn, inr, outBtn, thCls } from "@/components/master/module-kit";
import { advanceDue, calcSlip, daysIn, monthKey, monthLabel, suggestedIncentive, useHr, type Slip, type Store } from "@/components/hr/hr-store";

import { useState } from "react";
import { Download, Eye, Lock, MinusCircle, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TableExportActions from "@/components/layout/TableExportActions";

const eligible = (st: Store, month: string) => st.employees.filter((e) => e.status === "Active" && e.joined <= `${month}-${String(daysIn(month)).padStart(2, "0")}`);
const build = (st: Store, month: string) => {
  const inc = st.payroll[month]?.incentives ?? {};
  return eligible(st, month).map((e) => calcSlip(st, e, month, inc[e.id] ?? suggestedIncentive(st, e)));
};

export default function PayrollPage() {
  const [s, update] = useHr();
  const [month, setMonth] = useState(monthKey(-1));
  const [confirm, setConfirm] = useState(false);
  const [viewSlip, setViewSlip] = useState<Slip | null>(null);
  const run = s.payroll[month];
  const locked = Boolean(run?.locked);
  const rows = locked ? run.slips : build(s, month);
  const inProgress = month >= monthKey(0);

  const sum = (f: (x: (typeof rows)[number]) => number) => rows.reduce((t, x) => t + f(x), 0);
  const net = sum((x) => x.net), ded = sum((x) => x.ded);
  const employerCost = sum((x) => x.earned + x.incentive + x.erPf + x.erEsi);

  const setInc = (id: number, v: number) => update((st) => {
    const cur = st.payroll[month] ?? { locked: false, incentives: {}, slips: [], on: "" };
    return { ...st, payroll: { ...st.payroll, [month]: { ...cur, incentives: { ...cur.incentives, [id]: v } } } };
  });
  const finalize = () => {
    update((st) => {
      const slips = build(st, month);
      const ids = new Set(slips.map((x) => x.empId));
      return {
        ...st,
        advances: st.advances.map((a) => (ids.has(a.empId) && a.date <= `${month}-31` ? { ...a, recovered: a.recovered + advanceDue(a) } : a)),
        payroll: { ...st.payroll, [month]: { locked: true, incentives: Object.fromEntries(slips.map((x) => [x.empId, x.incentive])), slips, on: d(0) } },
      };
    });
    setConfirm(false);
  };
  const exportBank = () => {
    const head = ["Employee", "Account number", "IFSC", "Bank", "Net pay", "Narration"];
    const body = rows.map((x) => [x.name, x.accNo, x.ifsc, x.bank, x.net, `Salary ${monthLabel(month)}`]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `bank-advice-${month}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Payroll" subtitle="Monthly salary run from attendance, salary structure, advances and incentives.">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={month || null} onValueChange={(value) => setMonth(value ?? "")}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-white" aria-label="Payroll month"><SelectValue /></SelectTrigger>
            <SelectContent>{[0, -1, -2].map((o) => <SelectItem key={o} value={monthKey(o)}>{monthLabel(monthKey(o))}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="lg" className={outBtn} onClick={exportBank}><Download /> Bank advice</Button>
          <TableExportActions />
          {!locked && <Button size="lg" className={darkBtn} disabled={inProgress} onClick={() => setConfirm(true)}><Lock /> Finalize payroll</Button>}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Wallet size={24} />} value={inr(net)} label="Net pay to employees" />
        <StatCard icon={<MinusCircle size={24} />} value={inr(ded)} label="Total deductions" />
        <StatCard icon={<Users size={24} />} value={inr(employerCost)} label="Total cost to company" />
      </div>

      {inProgress && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{monthLabel(month)} is still running. This is a preview. Payroll can be finalized after the month ends.</p>}
      {locked && <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><Lock size={15} /> Payroll for {monthLabel(month)} was finalized on {run.on}. Payslips are ready.</p>}

      <Panel className="overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Paid days", "Earned", "Incentive", "Deductions", "Net pay"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.map((x) => {
              const parts = [x.pf && `PF ${inr(x.pf)}`, x.esi && `ESI ${inr(x.esi)}`, x.pt && `PT ${inr(x.pt)}`, x.advance && `Advance ${inr(x.advance)}`, x.other && `Other ${inr(x.other)}`].filter(Boolean).join(" · ");
              return (
                <TableRow key={x.empId}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={x.name} /><div><p className="font-semibold">{x.name}</p><p className="text-sm text-muted-foreground">{x.code} · {x.dept}</p></div></div></TableCell>
                  <TableCell className="px-4"><p>{x.paidDays} / {x.days}</p>{x.lop > 0 && <p className="text-sm text-red-600">{x.lop} LOP</p>}</TableCell>
                  <TableCell className="px-4">{inr(x.earned)}</TableCell>
                  <TableCell className="px-4">
                    {locked ? inr(x.incentive) : <Input type="number" min={0} aria-label={`Incentive for ${x.name}`} value={x.incentive} onChange={(e) => setInc(x.empId, Number(e.target.value))} className="h-9 w-28 rounded-lg border-slate-200" />}
                  </TableCell>
                  <TableCell className="px-4"><p className="font-medium">{inr(x.ded)}</p><p className="max-w-[260px] truncate text-sm text-muted-foreground">{parts || "—"}</p></TableCell>
                  <TableCell className="px-4 text-base font-bold">{inr(x.net)}</TableCell>
                  <TableCell className="px-4 text-right"><Button variant="ghost" size="icon" aria-label={`View payroll breakdown for ${x.name}`} title="View payroll breakdown" onClick={() => setViewSlip(x)}><Eye /></Button></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-14 text-center text-muted-foreground">No employees to pay for this month.</TableCell></TableRow>}
          </TableBody>
          <TableFooter className="bg-slate-50/70">
            <TableRow>
              <TableCell className="px-4 font-semibold" colSpan={2}>Total · {rows.length} employees</TableCell>
              <TableCell className="px-4 font-semibold">{inr(sum((x) => x.earned))}</TableCell>
              <TableCell className="px-4 font-semibold">{inr(sum((x) => x.incentive))}</TableCell>
              <TableCell className="px-4 font-semibold">{inr(ded)}</TableCell>
              <TableCell className="px-4 text-base font-bold">{inr(net)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Panel>
      {viewSlip && (() => {
        const earnings: [string, number][] = [["Basic", viewSlip.basic], ["HRA", viewSlip.hra], ["Conveyance", viewSlip.conv], ["Special allowance", viewSlip.special], ["Incentive", viewSlip.incentive]];
        const deductions: [string, number][] = [["Provident fund", viewSlip.pf], ["ESI", viewSlip.esi], ["Professional tax", viewSlip.pt], ["Salary advance", viewSlip.advance], ["Other deductions", viewSlip.other]];
        return <DetailDialog
          wide
          open
          onOpenChange={() => setViewSlip(null)}
          title={viewSlip.name}
          description={`${monthLabel(viewSlip.month)} payroll · ${viewSlip.code} · ${viewSlip.dept}`}
          footer={<Button variant="outline" size="lg" className={outBtn} onClick={() => setViewSlip(null)}>Close</Button>}
        >
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <KV label="Paid days">{viewSlip.paidDays} / {viewSlip.days}{viewSlip.lop ? ` · ${viewSlip.lop} LOP` : ""}</KV>
              <KV label="Gross salary">{inr(viewSlip.gross)}</KV>
              <KV label="Net pay">{inr(viewSlip.net)}</KV>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["Earnings", earnings, viewSlip.earned + viewSlip.incentive], ["Deductions", deductions, viewSlip.ded]] as const).map(([heading, items, total]) => (
                <section key={heading} className="rounded-lg bg-slate-50/60 p-3">
                  <h3 className="mb-1.5 text-xs font-semibold text-slate-700">{heading}</h3>
                  <ul className="space-y-1.5 text-xs">
                    {items.map(([label, amount]) => <li key={label} className="flex justify-between gap-3"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{inr(amount)}</span></li>)}
                    <li className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900"><span>Total</span><span>{inr(total)}</span></li>
                  </ul>
                </section>
              ))}
            </div>
            <KV label="Employer contributions">PF {inr(viewSlip.erPf)} · ESI {inr(viewSlip.erEsi)}</KV>
          </div>
        </DetailDialog>;
      })()}
      {!locked && <p className="text-sm text-muted-foreground">Installation incentive is suggested from each crew’s kW × rate (Installation Team page). You can edit it before finalizing.</p>}

      <DetailDialog plainHeader open={confirm} onOpenChange={setConfirm} title={`Finalize ${monthLabel(month)}?`} description="This cannot be undone."
        footer={<><Button variant="outline" size="lg" className={outBtn} onClick={() => setConfirm(false)}>Cancel</Button><Button size="lg" className={darkBtn} onClick={finalize}><Lock /> Finalize</Button></>}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Salary of <span className="font-semibold text-foreground">{rows.length} employees</span> is locked, net pay {inr(net)}.</li>
          <li>• Payslips are generated.</li>
          <li>• Advance EMIs of {inr(sum((x) => x.advance))} are marked as recovered.</li>
          <li>• Later attendance or salary edits will not change this month.</li>
        </ul>
        <div className="mt-3"><StatusBadge tone="amber">Check LOP days and incentives first</StatusBadge></div>
      </DetailDialog>
    </div>
  );
}
