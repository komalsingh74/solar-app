"use client";

import { Avatar, Chip, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField } from "@/components/ui/page-layout";
import { SideSheet, d, darkBtn, fmtDate, pillList, pillTrig, thCls } from "@/components/master/module-kit";
import { LEAVE_QUOTA, attOf, isSunday, monthAtt, monthKey, monthLabel, rangeDates, useHr } from "@/components/hr/hr-store";

import { useState } from "react";
import { CalendarOff, Check, ClipboardCheck, Plus, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MARKS: [string, string][] = [["P", "Present"], ["H", "Half day"], ["A", "Absent"], ["L", "Leave"]];
const attTone: Record<string, Tone> = { P: "green", H: "amber", A: "red", L: "indigo", U: "red", W: "slate", "": "slate" };
const attName: Record<string, string> = { P: "Present", H: "Half day", A: "Absent", L: "On leave", U: "Unpaid leave", W: "Weekly off", "": "Not marked" };
const leaveTone: Record<string, Tone> = { Pending: "amber", Approved: "green", Rejected: "red" };
const TYPES = ["Casual", "Sick", "Earned", "Unpaid"];

export default function AttendancePage() {
  const [s, update] = useHr();
  const [tab, setTab] = useState("today");
  const [month, setMonth] = useState(monthKey(0));
  const [attendanceDate, setAttendanceDate] = useState(d(0));
  const [department, setDepartment] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ emp: "", type: "Casual", from: d(1), to: d(1), reason: "" });
  const today = attendanceDate, sunday = isSunday(today);
  const active = s.employees.filter((e) => e.status === "Active");
  const departments = [...new Set(active.map((e) => e.dept).filter(Boolean))];
  const todayEmployees = department === "all" ? active : active.filter((e) => e.dept === department);
  const todayMarks = todayEmployees.map((e) => attOf(s, e, today));
  const mark = (id: number, v: string) => update((st) => ({ ...st, att: { ...st.att, [`${today}|${id}`]: v } }));
  const markAll = () => update((st) => { const att = { ...st.att }; todayEmployees.forEach((e) => { if (!att[`${today}|${e.id}`]) att[`${today}|${e.id}`] = "P"; }); return { ...st, att }; });

  const used = (empId: number, type: string) => s.leaves.filter((l) => l.empId === empId && l.type === type && l.status === "Approved").reduce((a, l) => a + l.days, 0);
  const left = (empId: number, type: string) => LEAVE_QUOTA[type] - used(empId, type);
  const emp = s.employees.find((e) => e.name === draft.emp);
  const days = rangeDates(draft.from, draft.to).filter((x) => !isSunday(x)).length;
  const error = !emp ? "Select an employee." : draft.to < draft.from ? "End date is before start date." : days === 0 ? "Selected dates are all weekly offs." : draft.type !== "Unpaid" && days > left(emp.id, draft.type) ? `Only ${left(emp.id, draft.type)} ${draft.type} leave days left. Choose Unpaid or fewer days.` : !draft.reason.trim() ? "Add a reason." : "";
  const apply = () => {
    if (error || !emp) return;
    update((st) => ({ ...st, leaves: [{ id: Date.now(), empId: emp.id, type: draft.type, from: draft.from, to: draft.to, days, reason: draft.reason, status: "Pending" }, ...st.leaves] }));
    setFormOpen(false);
  };
  const decide = (id: number, ok: boolean) => update((st) => {
    const l = st.leaves.find((x) => x.id === id)!; const att = { ...st.att };
    if (ok) rangeDates(l.from, l.to).filter((x) => !isSunday(x)).forEach((x) => { att[`${x}|${l.empId}`] = l.type === "Unpaid" ? "U" : "L"; });
    return { ...st, att, leaves: st.leaves.map((x) => (x.id === id ? { ...x, status: ok ? "Approved" : "Rejected" } : x)) };
  });
  const name = (id: number) => s.employees.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="!space-y-2">
      <PageHeader title="Attendance & leave" subtitle="Daily attendance, monthly summary and leave approvals. Loss-of-pay days go straight to payroll.">
        <Button size="lg" className={darkBtn} onClick={() => { setDraft({ emp: "", type: "Casual", from: d(1), to: d(1), reason: "" }); setFormOpen(true); }}><Plus /> Apply leave</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UserCheck size={24} />} value={todayMarks.filter((mark) => ["P", "H"].includes(mark)).length} label="Present today" />
        <StatCard icon={<CalendarOff size={24} />} value={`${todayMarks.filter((mark) => mark === "A").length} / ${todayMarks.filter((mark) => ["L", "U"].includes(mark)).length}`} label="Absent / on leave" />
        <StatCard icon={<ClipboardCheck size={24} />} value={todayMarks.filter((mark) => !mark).length} label="Not marked" />
        <StatCard icon={<ClipboardCheck size={24} />} value={s.leaves.filter((l) => l.status === "Pending").length} label="Leave requests pending" />
      </div>

      <Panel className="overflow-hidden">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <TabsList className={pillList}>
              <TabsTrigger value="today" className={pillTrig}>Today</TabsTrigger>
              <TabsTrigger value="month" className={pillTrig}>Monthly summary</TabsTrigger>
              <TabsTrigger value="leave" className={pillTrig}>Leave</TabsTrigger>
            </TabsList>
            {tab === "today" && <>
              <div className="ml-auto flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-medium text-slate-500">Date
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => setAttendanceDate(event.target.value)}
                    aria-label="Attendance date"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-500">Department
                  <Select value={department || null} onValueChange={(value) => setDepartment(value ?? "")}>
                    <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50 text-sm font-normal text-slate-700" aria-label="Department"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                {!sunday && <Button variant="outline" size="sm" className="rounded-lg border-slate-200" onClick={markAll}><Check /> Mark unmarked as present</Button>}
              </div>
            </>}
            {tab === "month" && (
              <Select value={month || null} onValueChange={(value) => setMonth(value ?? "")}>
                <SelectTrigger className="ml-auto h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Month"><SelectValue /></SelectTrigger>
                <SelectContent>{[0, -1, -2].map((o) => <SelectItem key={o} value={monthKey(o)}>{monthLabel(monthKey(o))}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </Tabs>

        {tab === "today" && (
          <>
            {sunday && <p className="mx-4 mb-3 rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">Today is a weekly off. Mark attendance only for staff who worked.</p>}
            <p className="px-4 pb-3 text-xs text-muted-foreground">Illustrative UI preview — numbers are sample data, not live attendance.</p>
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Shift", "Status", "Mark attendance"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {todayEmployees.map((e) => { const a = attOf(s, e, today); return (
                  <TableRow key={e.id}>
                    <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={e.name} /><div><p className="font-semibold">{e.name}</p><p className="text-sm text-muted-foreground">{e.dept}</p></div></div></TableCell>
                    <TableCell className="px-4">{e.shift}</TableCell>
                    <TableCell className="px-4"><StatusBadge tone={attTone[a]}>{attName[a]}</StatusBadge></TableCell>
                    <TableCell className="px-4"><div className="flex gap-1.5">{MARKS.map(([k, l]) => <Button key={k} size="sm" variant={a === k ? "default" : "outline"} className={`rounded-lg ${a === k ? "bg-slate-950 text-white hover:bg-slate-800" : "border-slate-200"}`} onClick={() => mark(e.id, k)}>{l}</Button>)}</div></TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          </>
        )}

        {tab === "month" && (
          <Table>
            <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Present", "Half", "Absent", "Leave", "Unpaid", "LOP days", "Attendance"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {active.map((e) => { const m = monthAtt(s, e, month); const worked = m.P + m.H + m.L + m.A + m.U + m.H; const pct = worked ? Math.round(((m.P + m.H * 0.5 + m.L) / (m.P + m.H + m.L + m.A + m.U || 1)) * 100) : 0; return (
                <TableRow key={e.id}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={e.name} /><span className="font-semibold">{e.name}</span></div></TableCell>
                  <TableCell className="px-4">{m.P}</TableCell><TableCell className="px-4">{m.H}</TableCell><TableCell className="px-4">{m.A}</TableCell><TableCell className="px-4">{m.L}</TableCell><TableCell className="px-4">{m.U}</TableCell>
                  <TableCell className={`px-4 font-semibold ${m.lop ? "text-red-600" : ""}`}>{m.lop}</TableCell>
                  <TableCell className="px-4"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${pct < 85 ? "bg-amber-500" : "bg-green-600"}`} style={{ width: `${pct}%` }} /></div><span className="text-sm">{pct}%</span></div></TableCell>
                </TableRow>
              ); })}
            </TableBody>
          </Table>
        )}

        {tab === "leave" && (
          <div className="space-y-4 pb-4">
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Type", "Dates", "Days", "Reason", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
              <TableBody>
                {s.leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="px-4 py-3 font-semibold">{name(l.empId)}</TableCell>
                    <TableCell className="px-4"><Chip>{l.type}</Chip></TableCell>
                    <TableCell className="px-4">{fmtDate(l.from)}{l.to !== l.from ? ` – ${fmtDate(l.to)}` : ""}</TableCell>
                    <TableCell className="px-4">{l.days}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">{l.reason}</TableCell>
                    <TableCell className="px-4"><StatusBadge tone={leaveTone[l.status]}>{l.status}</StatusBadge></TableCell>
                    <TableCell className="px-4 text-right">{l.status === "Pending" && <div className="flex justify-end gap-1.5"><Button size="sm" className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" onClick={() => decide(l.id, true)}><Check /> Approve</Button><Button size="sm" variant="outline" className="rounded-lg border-slate-200" onClick={() => decide(l.id, false)}><X /> Reject</Button></div>}</TableCell>
                  </TableRow>
                ))}
                {s.leaves.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No leave requests.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="px-4">
              <p className="mb-2 text-sm font-semibold">Leave balance (days left this year)</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((e) => <div key={e.id} className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-semibold">{e.name}</p><p className="text-muted-foreground">Casual {left(e.id, "Casual")} · Sick {left(e.id, "Sick")} · Earned {left(e.id, "Earned")}</p></div>)}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title="Apply leave" description="Approved paid leave is marked automatically in attendance. Unpaid leave becomes loss of pay." error={error} saveLabel="Submit request" onSave={apply}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Employee" value={draft.emp} onChange={(v) => setDraft((x) => ({ ...x, emp: v }))} options={active.map((e) => e.name)} placeholder="Select employee" />
          <SelectField label="Leave type" value={draft.type} onChange={(v) => setDraft((x) => ({ ...x, type: v }))} options={TYPES} />
          <div className="flex items-end pb-3 text-sm text-muted-foreground">{emp && draft.type !== "Unpaid" ? `${left(emp.id, draft.type)} days left` : ""}</div>
          <TextField label="From" type="date" value={draft.from} onChange={(v) => setDraft((x) => ({ ...x, from: v, to: v > x.to ? v : x.to }))} />
          <TextField label="To" type="date" value={draft.to} onChange={(v) => setDraft((x) => ({ ...x, to: v }))} />
          <p className="text-sm sm:col-span-2">Working days requested (Sundays excluded): <span className="font-semibold">{days}</span></p>
          <TextField className="sm:col-span-2" label="Reason" value={draft.reason} onChange={(v) => setDraft((x) => ({ ...x, reason: v }))} />
        </div>
      </SideSheet>
    </div>
  );
}
