"use client";

import { Avatar, KV, PageHeader, Panel, StatCard } from "@/components/ui/page-layout";
import { DetailDialog, darkBtn, inr, outBtn, thCls } from "@/components/master/module-kit";
import { monthLabel, useHr, type Slip } from "@/components/hr/hr-store";

import Link from "next/link";
import { useState } from "react";
import { Eye, FileText, Printer, Wallet } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const earnings = (x: Slip): [string, number][] => [["Basic", x.basic], ["House rent allowance", x.hra], ["Conveyance", x.conv], ["Special allowance", x.special], ["Incentive", x.incentive]];
const deductions = (x: Slip): [string, number][] => [["Provident fund", x.pf], ["ESI", x.esi], ["Professional tax", x.pt], ["Salary advance", x.advance], ["Other deductions", x.other]];

const printSlip = (x: Slip, company: string) => {
  const w = window.open("", "_blank", "width=820,height=920");
  if (!w) return;
  const rows = (l: [string, number][]) => l.filter(([, v]) => v > 0).map(([a, v]) => `<tr><td>${a}</td><td class="r">${inr(v)}</td></tr>`).join("");
  w.document.write(`<html><head><title>Payslip ${x.name} ${x.month}</title><style>
    body{font-family:Arial,sans-serif;color:#0f172a;padding:36px}h1{margin:0;font-size:22px}p{margin:2px 0;color:#475569;font-size:13px}
    .box{border:1px solid #cbd5e1;border-radius:8px;margin-top:18px}.g{display:grid;grid-template-columns:1fr 1fr}.h{background:#f1f5f9;padding:8px 12px;font-weight:700;font-size:13px}
    table{width:100%;border-collapse:collapse}td{padding:7px 12px;border-top:1px solid #e2e8f0;font-size:13px}.r{text-align:right}.n{font-size:18px;font-weight:700;padding:14px 12px}
  </style></head><body>
    <h1>${company}</h1><p>Payslip for ${monthLabel(x.month)}</p>
    <div class="box g"><div style="padding:12px"><p><b>${x.name}</b></p><p>${x.code} · ${x.designation}</p><p>${x.dept}</p></div>
    <div style="padding:12px"><p>Paid days: <b>${x.paidDays} / ${x.days}</b> (LOP ${x.lop})</p><p>Bank: ${x.bank} ••••${x.accNo.slice(-4)}</p></div></div>
    <div class="box g"><div><div class="h">Earnings</div><table>${rows(earnings(x))}<tr><td><b>Total earnings</b></td><td class="r"><b>${inr(x.earned + x.incentive)}</b></td></tr></table></div>
    <div><div class="h">Deductions</div><table>${rows(deductions(x))}<tr><td><b>Total deductions</b></td><td class="r"><b>${inr(x.ded)}</b></td></tr></table></div></div>
    <div class="box"><table><tr><td class="n">Net pay</td><td class="r n">${inr(x.net)}</td></tr></table></div>
    <p style="margin-top:24px">This is a computer-generated payslip and does not need a signature.</p>
  </body></html>`);
  w.document.close(); w.focus(); w.print();
};

export default function PayslipsPage() {
  const [s] = useHr();
  const months = Object.keys(s.payroll).filter((m) => s.payroll[m].locked).sort().reverse();
  const [pick, setPick] = useState("");
  const month = months.includes(pick) ? pick : months[0];
  const slips = month ? s.payroll[month].slips : [];
  const [viewId, setViewId] = useState<number | null>(null);
  const view = slips.find((x) => x.empId === viewId);

  return (
    <div className="!space-y-2">
      <PageHeader title="Payslips" subtitle="Payslips generated from finalized payroll. View, print or save as PDF.">
        {months.length > 0 && (
          <Select value={month || null} onValueChange={(value) => setPick(value ?? "")}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-white" aria-label="Month"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </PageHeader>

      {months.length === 0 ? (
        <Panel className="py-16 text-center">
          <FileText className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="font-semibold">No payslips yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Payslips appear here after you finalize a month in Payroll.</p>
          <Link href="/payroll" className={cn(buttonVariants({ size: "lg" }), darkBtn, "mt-4")}>Go to Payroll</Link>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={<FileText size={24} />} value={slips.length} label="Payslips generated" />
            <StatCard icon={<Wallet size={24} />} value={inr(slips.reduce((t, x) => t + x.net, 0))} label="Total net pay" />
            <StatCard icon={<Wallet size={24} />} value={inr(slips.reduce((t, x) => t + x.pf + x.erPf + x.esi + x.erEsi, 0))} label="PF + ESI to deposit" />
          </div>
          <Panel className="overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Paid days", "Earnings", "Deductions", "Net pay"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
              <TableBody>
                {slips.map((x) => (
                  <TableRow key={x.empId}>
                    <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={x.name} /><div><p className="font-semibold">{x.name}</p><p className="text-sm text-muted-foreground">{x.code} · {x.designation}</p></div></div></TableCell>
                    <TableCell className="px-4">{x.paidDays} / {x.days}</TableCell>
                    <TableCell className="px-4">{inr(x.earned + x.incentive)}</TableCell>
                    <TableCell className="px-4">{inr(x.ded)}</TableCell>
                    <TableCell className="px-4 font-bold">{inr(x.net)}</TableCell>
                    <TableCell className="px-4 text-right">
                      <Button variant="ghost" size="icon" aria-label={`View payslip of ${x.name}`} onClick={() => setViewId(x.empId)}><Eye /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Print payslip of ${x.name}`} onClick={() => printSlip(x, s.settings.company)}><Printer /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </>
      )}

      {view && (
        <DetailDialog wide open onOpenChange={() => setViewId(null)} title={view.name} description={`Payslip · ${monthLabel(view.month)} · ${view.code}`}
          footer={<><Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button><Button size="lg" className={darkBtn} onClick={() => printSlip(view, s.settings.company)}><Printer /> Print / save PDF</Button></>}>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <KV label="Designation">{view.designation}</KV>
              <KV label="Paid days">{view.paidDays} / {view.days} (LOP {view.lop})</KV>
              <KV label="Bank">{view.bank} ••••{view.accNo.slice(-4)}</KV>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([["Earnings", earnings(view), view.earned + view.incentive], ["Deductions", deductions(view), view.ded]] as const).map(([title, list, total]) => (
                <div key={title} className="rounded-xl border border-slate-200">
                  <p className="rounded-t-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold">{title}</p>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {list.filter(([, v]) => v > 0).map(([l, v]) => <li key={l} className="flex justify-between px-4 py-2"><span>{l}</span><span>{inr(v)}</span></li>)}
                    <li className="flex justify-between px-4 py-2.5 font-semibold"><span>Total</span><span>{inr(total)}</span></li>
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-950 px-5 py-4 text-white"><span className="font-medium">Net pay</span><span className="text-2xl font-bold">{inr(view.net)}</span></div>
          </div>
        </DetailDialog>
      )}
    </div>
  );
}
