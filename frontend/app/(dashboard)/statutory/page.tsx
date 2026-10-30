"use client";

import { PageHeader, Panel, SelectField, TextField } from "@/components/ui/page-layout";
import { darkBtn, inr, outBtn } from "@/components/master/module-kit";
import { calcSlip, monthKey, monthLabel, useHr, type Settings } from "@/components/hr/hr-store";

import { useState, type ReactNode } from "react";
import { CalendarClock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 flex-none rounded-full transition-colors ${on ? "bg-indigo-600" : "bg-slate-300"}`}>
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}
function Section({ title, hint, on, onToggle, children }: { title: string; hint: string; on?: boolean; onToggle?: (v: boolean) => void; children?: ReactNode }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-muted-foreground">{hint}</p></div>
        {onToggle && <Toggle on={Boolean(on)} onChange={onToggle} label={`${title} enabled`} />}
      </div>
      {children && (on === undefined || on) && <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>}
    </Panel>
  );
}

export default function StatutoryPage() {
  const [s, update] = useHr();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [sample, setSample] = useState("25000");
  const [sampleStruct, setSampleStruct] = useState("");
  const cur = draft ?? s.settings;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(s.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft({ ...cur, [k]: v });
  const num = (k: keyof Settings) => (v: string) => set(k, Number(v) as never);
  const txt = (k: keyof Settings) => (v: string) => set(k, v as never);

  const error = [cur.pfRate, cur.esiRate, cur.esiEmployerRate].some((r) => r < 0 || r > 100) ? "Rates must be between 0 and 100." : cur.pfCeilingOn && cur.pfCeiling <= 0 ? "Enter the PF wage ceiling." : !cur.company.trim() ? "Company name is required." : "";

  const gross = Number(sample) || 0;
  const struct = sampleStruct || s.structures[0]?.name || "";
  const ex = calcSlip({ ...s, settings: cur }, { ...s.employees[0], id: -1, gross, structure: struct }, monthKey(-1), 0, 0);

  const lastMonth = Object.keys(s.payroll).filter((m) => s.payroll[m].locked).sort().pop();
  const slips = lastMonth ? s.payroll[lastMonth].slips : [];
  const pfDue = slips.reduce((t, x) => t + x.pf + x.erPf, 0), esiDue = slips.reduce((t, x) => t + x.esi + x.erEsi, 0);
  const dueMonth = lastMonth ? monthKey(Number(lastMonth.slice(0, 4)) * 12 + Number(lastMonth.slice(5)) - (Number(monthKey(0).slice(0, 4)) * 12 + Number(monthKey(0).slice(5))) + 1) : "";

  return (
    <div className="!space-y-2">
      <PageHeader title="Statutory & tax settings" subtitle="PF, ESI, professional tax and registration numbers. Payroll follows these rules.">
        <div className="flex flex-wrap items-center gap-3">
          {!dirty && <span className="inline-flex items-center gap-1.5 text-sm text-green-700"><Check size={16} /> All changes saved</span>}
          {dirty && <Button variant="outline" size="lg" className={outBtn} onClick={() => setDraft(null)}>Discard</Button>}
          <Button size="lg" className={darkBtn} disabled={!dirty || Boolean(error)} onClick={() => { update((st) => ({ ...st, settings: cur })); setDraft(null); }}>Save changes</Button>
        </div>
      </PageHeader>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-2 xl:grid-cols-[1fr_380px]">
        <div className="space-y-2">
          <Section title="Provident fund (PF)" hint="Deducted from basic salary. Employer pays the same rate." on={cur.pfOn} onToggle={(v) => set("pfOn", v)}>
            <TextField label="Rate (%)" type="number" min={0} value={String(cur.pfRate)} onChange={num("pfRate")} />
            <SelectField label="Limit to wage ceiling" value={cur.pfCeilingOn ? "Yes" : "No"} onChange={(v) => set("pfCeilingOn", v === "Yes")} options={["Yes", "No"]} />
            {cur.pfCeilingOn && <TextField label="Wage ceiling (₹)" type="number" min={0} value={String(cur.pfCeiling)} onChange={num("pfCeiling")} />}
            <TextField label="PF establishment code" value={cur.pfNo} onChange={txt("pfNo")} />
          </Section>

          <Section title="Employee state insurance (ESI)" hint="Applies only to employees whose monthly gross is within the limit." on={cur.esiOn} onToggle={(v) => set("esiOn", v)}>
            <TextField label="Employee rate (%)" type="number" min={0} value={String(cur.esiRate)} onChange={num("esiRate")} />
            <TextField label="Employer rate (%)" type="number" min={0} value={String(cur.esiEmployerRate)} onChange={num("esiEmployerRate")} />
            <TextField label="Gross salary limit (₹)" type="number" min={0} value={String(cur.esiLimit)} onChange={num("esiLimit")} />
            <TextField label="ESIC code" value={cur.esiNo} onChange={txt("esiNo")} />
          </Section>

          <Section title="Professional tax" hint="Fixed monthly amount as per your state slab. Leave off if your state has none." on={cur.ptOn} onToggle={(v) => set("ptOn", v)}>
            <TextField label="Monthly amount (₹)" type="number" min={0} value={String(cur.ptAmount)} onChange={num("ptAmount")} />
            <TextField label="Applies when salary is above (₹)" type="number" min={0} value={String(cur.ptAbove)} onChange={num("ptAbove")} />
          </Section>

          <Section title="Income tax (TDS on salary)" hint="Turn on if any employee’s annual income crosses the taxable limit. Compute TDS with your CA and enter it as a deduction." on={cur.tdsOn} onToggle={(v) => set("tdsOn", v)} />

          <Section title="Company registration" hint="Printed on challans and payslips.">
            <TextField label="Company name" value={cur.company} onChange={txt("company")} />
            <TextField label="Company PAN" value={cur.pan} onChange={txt("pan")} />
            <TextField label="TAN" value={cur.tan} onChange={txt("tan")} />
          </Section>
        </div>

        <div className="space-y-2">
          <Panel className="p-5">
            <h2 className="text-lg font-bold">Try it on a salary</h2>
            <p className="mb-4 text-sm text-muted-foreground">See what these rules do to a payslip before you save.</p>
            <div className="grid gap-3">
              <TextField label="Monthly gross (₹)" type="number" min={0} value={sample} onChange={setSample} />
              <SelectField label="Salary structure" value={struct} onChange={setSampleStruct} options={s.structures.map((x) => x.name)} />
            </div>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {([["Earned salary", ex.earned], ["PF (employee)", -ex.pf], ["ESI (employee)", -ex.esi], ["Professional tax", -ex.pt]] as [string, number][]).map(([l, v]) => (
                <li key={l} className="flex justify-between py-2"><span>{l}</span><span className={v < 0 ? "text-red-600" : ""}>{v < 0 ? "− " : ""}{inr(Math.abs(v))}</span></li>
              ))}
              <li className="flex justify-between py-2.5 text-base font-bold"><span>Take-home</span><span>{inr(ex.net)}</span></li>
              <li className="flex justify-between py-2 text-muted-foreground"><span>Employer PF + ESI</span><span>{inr(ex.erPf + ex.erEsi)}</span></li>
            </ul>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center gap-2"><CalendarClock size={18} className="text-indigo-600" /><h2 className="text-lg font-bold">Next challan</h2></div>
            {lastMonth ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-muted-foreground">For {monthLabel(lastMonth)}, deposit by <span className="font-semibold text-foreground">15 {monthLabel(dueMonth).split(" ")[0]}</span>.</p>
                <p className="flex justify-between"><span>PF (employee + employer)</span><span className="font-semibold">{inr(pfDue)}</span></p>
                <p className="flex justify-between"><span>ESI (employee + employer)</span><span className="font-semibold">{inr(esiDue)}</span></p>
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Finalize a payroll month to see the PF and ESI amount to deposit.</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}