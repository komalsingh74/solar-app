"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, darkBtn, outBtn, thCls } from "@/components/master/module-kit";
import { useHr, type Shift } from "@/components/hr/hr-store";

import { useState } from "react";
import { Clock, Eye, Pencil, Plus, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = (s: Shift) => { const [a, b] = [s.start, s.end].map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))); return ((b - a) / 60).toFixed(1).replace(".0", ""); };
const t12 = (t: string) => new Date(`2000-01-01T${t}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function ShiftsPage() {
  const [s, update] = useHr();
  const blank: Shift = { id: 0, name: "", start: "09:30", end: "18:30", offDay: "Sunday", grace: 15 };
  const [draft, setDraft] = useState<Shift>(blank);
  const [open, setOpen] = useState(false);
  const [viewShift, setViewShift] = useState<Shift | null>(null);
  const set = (k: keyof Shift) => (v: string) => setDraft((x) => ({ ...x, [k]: k === "grace" ? Number(v) : v }));
  const error = !draft.name.trim() ? "Shift name is required." : draft.end <= draft.start ? "End time must be after start time." : "";
  const save = () => {
    if (error) return;
    update((st) => ({ ...st, shifts: draft.id ? st.shifts.map((x) => (x.id === draft.id ? draft : x)) : [...st.shifts, { ...draft, id: Date.now() }] }));
    setOpen(false);
  };
  const active = s.employees.filter((e) => e.status === "Active");
  const setShift = (id: number, shift: string) => update((st) => ({ ...st, employees: st.employees.map((e) => (e.id === id ? { ...e, shift } : e)) }));

  return (
    <div className="!space-y-2">
      <PageHeader title="Shifts & work schedules" subtitle="Office and site timings, weekly off and grace time. Assign every employee to a shift.">
        <Button size="lg" className={darkBtn} onClick={() => { setDraft(blank); setOpen(true); }}><Plus /> Add shift</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Clock size={24} />} value={s.shifts.length} label="Shifts defined" />
        <StatCard icon={<Users size={24} />} value={active.length} label="Employees rostered" />
        <StatCard icon={<Timer size={24} />} value={active.filter((e) => !s.shifts.some((x) => x.name === e.shift)).length} label="Without a valid shift" />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {s.shifts.map((x) => (
          <Panel key={x.id} className="p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-lg font-bold">{x.name} shift</p><p className="text-sm text-muted-foreground">{t12(x.start)} – {t12(x.end)} · {hours(x)} hrs</p></div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`View details for ${x.name}`} title="View details" onClick={() => setViewShift(x)}><Eye /></Button>
                <Button variant="ghost" size="icon" aria-label={`Edit ${x.name}`} title="Edit shift" onClick={() => { setDraft({ ...x }); setOpen(true); }}><Pencil /></Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5"><Chip>Off: {x.offDay}</Chip><Chip>Grace {x.grace} min</Chip><Chip>{active.filter((e) => e.shift === x.name).length} employees</Chip></div>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="p-4 pb-2"><p className="font-semibold">Roster</p><p className="text-sm text-muted-foreground">Change a shift here and attendance rules follow.</p></div>
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Department", "Weekly off", "Timing", "Shift"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {active.map((e) => { const sh = s.shifts.find((x) => x.name === e.shift); return (
              <TableRow key={e.id}>
                <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={e.name} /><span className="font-semibold">{e.name}</span></div></TableCell>
                <TableCell className="px-4"><Chip>{e.dept}</Chip></TableCell>
                <TableCell className="px-4">{sh?.offDay ?? "—"}</TableCell>
                <TableCell className="px-4">{sh ? `${t12(sh.start)} – ${t12(sh.end)}` : "—"}</TableCell>
                <TableCell className="px-4">
                  <Select value={e.shift} onValueChange={(v) => setShift(e.id, v)}>
                    <SelectTrigger className="h-9 w-[150px] rounded-lg border-slate-200" aria-label={`Shift for ${e.name}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{s.shifts.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </Panel>

      <SideSheet open={open} onOpenChange={setOpen} title={draft.id ? "Edit shift" : "New shift"} description="Timings, weekly off and how late is too late." error={error} saveLabel="Save shift" onSave={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Shift name" value={draft.name} onChange={set("name")} placeholder="Site" />
          <TextField label="Start time" type="time" value={draft.start} onChange={set("start")} />
          <TextField label="End time" type="time" value={draft.end} onChange={set("end")} />
          <SelectField label="Weekly off" value={draft.offDay} onChange={set("offDay")} options={DAYS} />
          <TextField label="Grace time (minutes)" type="number" min={0} value={String(draft.grace)} onChange={set("grace")} />
        </div>
      </SideSheet>

      {viewShift && (() => {
        const roster = active.filter((e) => e.shift === viewShift.name);
        return <DetailDialog
          open
          onOpenChange={() => setViewShift(null)}
          title={`${viewShift.name} shift`}
          description="Work schedule and assigned employees."
          footer={<>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewShift(null)}>Close</Button>
            <Button size="lg" className={darkBtn} onClick={() => { setDraft({ ...viewShift }); setViewShift(null); setOpen(true); }}><Pencil /> Edit shift</Button>
          </>}
        >
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <KV label="Working hours">{t12(viewShift.start)} – {t12(viewShift.end)} ({hours(viewShift)} hrs)</KV>
              <KV label="Weekly off">{viewShift.offDay}</KV>
              <KV label="Grace time">{viewShift.grace} minutes</KV>
              <KV label="Assigned employees">{roster.length}</KV>
            </div>
            <section>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Roster</h3>
              {roster.length ? <div className="divide-y divide-slate-100 rounded-lg bg-slate-50/60 px-3">
                {roster.map((e) => <div key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2.5"><Avatar name={e.name} /><div><p className="text-xs font-semibold text-slate-800">{e.name}</p><p className="text-[11px] text-slate-500">{e.designation}</p></div></div>
                  <Chip>{e.dept}</Chip>
                </div>)}
              </div> : <p className="rounded-lg bg-slate-50/70 px-3 py-2 text-xs text-slate-500">No active employees are assigned to this shift.</p>}
            </section>
          </div>
        </DetailDialog>;
      })()}
    </div>
  );
}
