"use client";

import { Chip, KV, PageHeader, Panel, StatCard, StatusBadge, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, darkBtn, inr, outBtn, thCls } from "@/components/master/module-kit";
import { useHr, type Structure } from "@/components/hr/hr-store";

import { useState } from "react";
import { Eye, Layers, Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SAMPLE = 30000;
const split = (st: Structure, gross: number) => { const basic = Math.round((gross * st.basic) / 100), hra = Math.round((gross * st.hra) / 100), conv = st.conv; return { basic, hra, conv, special: Math.max(0, gross - basic - hra - conv) }; };

export default function SalaryStructurePage() {
  const [s, update] = useHr();
  const blank: Structure = { id: 0, name: "", basic: 50, hra: 20, conv: 1600, pf: true, esi: true };
  const [draft, setDraft] = useState<Structure>(blank);
  const [open, setOpen] = useState(false);
  const [viewStructure, setViewStructure] = useState<Structure | null>(null);
  const set = (k: keyof Structure) => (v: string) => setDraft((x) => ({ ...x, [k]: k === "name" ? v : k === "pf" || k === "esi" ? v === "Yes" : Number(v) }));
  const sp = split(draft, SAMPLE);
  const error = !draft.name.trim() ? "Structure name is required." : draft.basic + draft.hra > 100 ? "Basic % + HRA % cannot exceed 100." : draft.basic < 30 ? "Basic below 30% of gross can create PF / labour-law issues." : sp.special < 0 ? "Components exceed gross." : "";
  const save = () => {
    if (error) return;
    update((st) => ({ ...st, structures: draft.id ? st.structures.map((x) => (x.id === draft.id ? draft : x)) : [...st.structures, { ...draft, id: Date.now() }] }));
    setOpen(false);
  };
  const users = (n: string) => s.employees.filter((e) => e.structure === n && e.status === "Active").length;

  return (
    <div className="!space-y-2">
      <PageHeader title="Salary structure" subtitle="Define how gross salary splits into basic, HRA and allowances, and which deductions apply.">
        <Button size="lg" className={darkBtn} onClick={() => { setDraft(blank); setOpen(true); }}><Plus /> Add structure</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Layers size={24} />} value={s.structures.length} label="Structures" />
        <StatCard icon={<Users size={24} />} value={s.employees.filter((e) => e.status === "Active").length} label="Employees covered" />
        <StatCard icon={<Layers size={24} />} value={inr(s.employees.filter((e) => e.status === "Active").reduce((a, e) => a + e.gross, 0))} label="Monthly gross payroll" />
      </div>

      <Panel className="overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Structure", `On ${inr(SAMPLE)} gross`, "Basic", "HRA", "Conveyance", "PF", "ESI", "Employees"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
          <TableBody>
            {s.structures.map((st) => { const p = split(st, SAMPLE); return (
              <TableRow key={st.id}>
                <TableCell className="px-4 py-3 font-semibold">{st.name}</TableCell>
                <TableCell className="px-4 text-sm text-muted-foreground">Basic {inr(p.basic)} · HRA {inr(p.hra)} · Special {inr(p.special)}</TableCell>
                <TableCell className="px-4">{st.basic}%</TableCell><TableCell className="px-4">{st.hra}%</TableCell><TableCell className="px-4">{inr(st.conv)}</TableCell>
                <TableCell className="px-4"><StatusBadge tone={st.pf ? "green" : "slate"}>{st.pf ? "Yes" : "No"}</StatusBadge></TableCell>
                <TableCell className="px-4"><StatusBadge tone={st.esi ? "green" : "slate"}>{st.esi ? "Yes" : "No"}</StatusBadge></TableCell>
                <TableCell className="px-4"><Chip>{users(st.name)}</Chip></TableCell>
                <TableCell className="px-4 text-right"><div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label={`View details for ${st.name}`} title="View details" onClick={() => setViewStructure(st)}><Eye /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${st.name}`} title="Edit structure" onClick={() => { setDraft({ ...st }); setOpen(true); }}><Pencil /></Button>
                </div></TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </Panel>

      <SideSheet open={open} onOpenChange={setOpen} title={draft.id ? "Edit structure" : "New structure"} description="Special allowance is whatever remains after the other components." error={error} saveLabel="Save structure" onSave={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Structure name" value={draft.name} onChange={set("name")} placeholder="Field" />
          <TextField label="Basic (% of gross)" type="number" min={0} value={String(draft.basic)} onChange={set("basic")} />
          <TextField label="HRA (% of gross)" type="number" min={0} value={String(draft.hra)} onChange={set("hra")} />
          <TextField label="Conveyance (₹ fixed)" type="number" min={0} value={String(draft.conv)} onChange={set("conv")} />
          <div />
          <SelectField label="PF applicable" value={draft.pf ? "Yes" : "No"} onChange={set("pf")} options={["Yes", "No"]} />
          <SelectField label="ESI applicable" value={draft.esi ? "Yes" : "No"} onChange={set("esi")} options={["Yes", "No"]} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="mb-2 text-sm font-semibold">Preview on {inr(SAMPLE)} gross</p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {([["Basic", sp.basic], ["HRA", sp.hra], ["Conveyance", sp.conv], ["Special", sp.special]] as const).map(([l, v]) => <div key={l}><p className="text-muted-foreground">{l}</p><p className="font-bold">{inr(v)}</p></div>)}
            </div>
          </div>
        </div>
      </SideSheet>

      {viewStructure && (() => {
        const preview = split(viewStructure, SAMPLE);
        const covered = s.employees.filter((e) => e.structure === viewStructure.name && e.status === "Active");
        return (
          <DetailDialog
            open
            onOpenChange={() => setViewStructure(null)}
            title={viewStructure.name}
            description={`Salary structure · preview on ${inr(SAMPLE)} gross`}
            footer={<>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewStructure(null)}>Close</Button>
              <Button size="lg" className={darkBtn} onClick={() => { setDraft({ ...viewStructure }); setViewStructure(null); setOpen(true); }}><Pencil /> Edit structure</Button>
            </>}
          >
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <KV label={`Basic · ${viewStructure.basic}%`}>{inr(preview.basic)}</KV>
                <KV label={`HRA · ${viewStructure.hra}%`}>{inr(preview.hra)}</KV>
                <KV label="Conveyance">{inr(preview.conv)}</KV>
                <KV label="Special allowance">{inr(preview.special)}</KV>
                <KV label="Provident fund"><StatusBadge tone={viewStructure.pf ? "green" : "slate"}>{viewStructure.pf ? "Applicable" : "Not applicable"}</StatusBadge></KV>
                <KV label="ESI"><StatusBadge tone={viewStructure.esi ? "green" : "slate"}>{viewStructure.esi ? "Applicable" : "Not applicable"}</StatusBadge></KV>
              </div>
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Employees covered ({covered.length})</h3>
                {covered.length ? <div className="flex flex-wrap gap-1.5">{covered.map((e) => <Chip key={e.id}>{e.name}</Chip>)}</div> : <p className="rounded-lg bg-slate-50/70 px-3 py-2 text-xs text-slate-500">No active employees are assigned to this structure.</p>}
              </section>
            </div>
          </DetailDialog>
        );
      })()}
    </div>
  );
}
