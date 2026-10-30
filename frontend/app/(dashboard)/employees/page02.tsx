"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, fmtDate, outBtn, thCls } from "@/components/master/module-kit";
import { DEPTS, EMP_TYPES, ROLES, certState, useHr, type Employee } from "@/components/hr/hr-store";

import { useMemo, useState } from "react";
import { Eye, Pencil, Phone, Plus, Search, ShieldAlert, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const certTone: Record<string, Tone> = { Valid: "green", Expiring: "amber", Expired: "red", "—": "slate" };
const mask = (s: string) => (s ? "••••" + s.slice(-4) : "—");

export default function EmployeesPage() {
  const [s, update] = useHr();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const blank = (): Employee => ({ id: 0, code: `EMP-${String(s.employees.length + 1).padStart(3, "0")}`, name: "", phone: "", email: "", dept: "Sales", designation: "", type: "Full-time", joined: d(0), status: "Active", reportsTo: "", shift: s.shifts[0]?.name ?? "", role: "Sales", structure: s.structures[0]?.name ?? "", gross: 0, pan: "", uan: "", bank: "", accNo: "", ifsc: "", licenceExpiry: "", safetyExpiry: "" });
  const [draft, setDraft] = useState<Employee>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const view = s.employees.find((e) => e.id === viewId);

  const rows = useMemo(() => s.employees.filter((e) => (dept === "all" || e.dept === dept) && `${e.name} ${e.code} ${e.phone} ${e.designation}`.toLowerCase().includes(q.toLowerCase())), [s.employees, q, dept]);
  const set = (k: keyof Employee) => (v: string) => setDraft((x) => ({ ...x, [k]: k === "gross" ? Number(v) : v }));
  const openForm = (e: Employee) => { setDraft({ ...e }); setFormOpen(true); };
  const error = !draft.name.trim() || !draft.phone.trim() ? "Name and phone are required." : !(draft.gross > 0) ? "Enter monthly gross salary (Payroll & bank tab)." : "";
  const save = () => {
    if (error) return;
    update((st) => ({ ...st, employees: draft.id ? st.employees.map((x) => (x.id === draft.id ? draft : x)) : [...st.employees, { ...draft, id: Date.now() }] }));
    setFormOpen(false);
  };
  const certDue = (e: Employee) => [certState(e.licenceExpiry), certState(e.safetyExpiry)].some((c) => c === "Expired" || c === "Expiring");
  const names = s.employees.map((e) => e.name);

  return (
    <div className="!space-y-2">
      <PageHeader title="Employees" subtitle="One record for every employee: job, salary, bank, documents and certificates.">
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank())}><Plus /> Add employee</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users size={24} />} value={s.employees.length} label="Total employees" />
        <StatCard icon={<UserCheck size={24} />} value={s.employees.filter((e) => e.status === "Active").length} label="Active" />
        <StatCard icon={<ShieldAlert size={24} />} value={s.employees.filter(certDue).length} label="Certificates to renew" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, ID, phone or designation" aria-label="Search employees" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={dept || null} onValueChange={(value) => setDept(value ?? "")}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by department"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All departments</SelectItem>{DEPTS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Department", "Reports to", "Shift", "Joined", "Certificates", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={e.name} /><div><p className="font-semibold">{e.name}</p><p className="text-sm text-muted-foreground">{e.code} · {e.designation}</p></div></div></TableCell>
                <TableCell className="px-4"><Chip>{e.dept}</Chip></TableCell>
                <TableCell className="px-4">{e.reportsTo || "—"}</TableCell>
                <TableCell className="px-4">{e.shift}</TableCell>
                <TableCell className="px-4">{fmtDate(e.joined)}</TableCell>
                <TableCell className="px-4">{e.dept === "Installation" ? <StatusBadge tone={certDue(e) ? "red" : "green"}>{certDue(e) ? "Renew" : "OK"}</StatusBadge> : "—"}</TableCell>
                <TableCell className="px-4"><StatusBadge tone={e.status === "Active" ? "green" : "amber"}>{e.status}</StatusBadge></TableCell>
                <TableCell className="px-4 text-right">
                  <Button variant="ghost" size="icon" aria-label={`View ${e.name}`} onClick={() => setViewId(e.id)}><Eye /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${e.name}`} onClick={() => openForm(e)}><Pencil /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No employees match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? "Edit employee" : "New employee"} description="This record feeds attendance, payroll, shifts and crews." error={error} saveLabel="Save employee" onSave={save}>
        <Tabs defaultValue="personal">
          <TabsList className={tabsListCls}>
            <TabsTrigger value="personal" className={tabCls}>Personal</TabsTrigger>
            <TabsTrigger value="job" className={tabCls}>Job</TabsTrigger>
            <TabsTrigger value="pay" className={tabCls}>Payroll & bank</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="grid gap-4 sm:grid-cols-2">
            <TextField className="sm:col-span-2" label="Full name" value={draft.name} onChange={set("name")} placeholder="Rohit Sharma" />
            <TextField label="Phone" type="tel" value={draft.phone} onChange={set("phone")} />
            <TextField label="Email" type="email" value={draft.email} onChange={set("email")} />
            <TextField label="PAN" value={draft.pan} onChange={set("pan")} />
            <TextField label="UAN (PF)" value={draft.uan} onChange={set("uan")} />
          </TabsContent>
          <TabsContent value="job" className="grid gap-4 sm:grid-cols-2">
            <TextField label="Employee ID" value={draft.code} onChange={set("code")} />
            <TextField label="Joining date" type="date" value={draft.joined} onChange={set("joined")} />
            <SelectField label="Department" value={draft.dept} onChange={set("dept")} options={DEPTS} />
            <TextField label="Designation" value={draft.designation} onChange={set("designation")} />
            <SelectField label="Employment type" value={draft.type} onChange={set("type")} options={EMP_TYPES} />
            <SelectField label="Reports to" value={draft.reportsTo || "—"} onChange={(v) => set("reportsTo")(v === "—" ? "" : v)} options={["—", ...names.filter((n) => n !== draft.name)]} />
            <SelectField label="Shift" value={draft.shift} onChange={set("shift")} options={s.shifts.map((x) => x.name)} />
            <SelectField label="System role" value={draft.role} onChange={set("role")} options={ROLES} />
            <SelectField label="Status" value={draft.status} onChange={set("status")} options={["Active", "Inactive"]} />
            <TextField label="Electrician licence expiry" type="date" value={draft.licenceExpiry} onChange={set("licenceExpiry")} />
            <TextField label="Height-safety training expiry" type="date" value={draft.safetyExpiry} onChange={set("safetyExpiry")} />
          </TabsContent>
          <TabsContent value="pay" className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Salary structure" value={draft.structure} onChange={set("structure")} options={s.structures.map((x) => x.name)} />
            <TextField label="Monthly gross salary (₹)" type="number" min={0} value={String(draft.gross)} onChange={set("gross")} />
            <TextField label="Bank name" value={draft.bank} onChange={set("bank")} />
            <TextField label="Account number" value={draft.accNo} onChange={set("accNo")} />
            <TextField className="sm:col-span-2" label="IFSC" value={draft.ifsc} onChange={set("ifsc")} />
          </TabsContent>
        </Tabs>
      </SideSheet>

      {view && (
        <DetailDialog open onOpenChange={() => setViewId(null)} title={view.name} description={`${view.code} · ${view.designation} · ${view.dept}`}
          footer={<><Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button><Button size="lg" className={darkBtn} onClick={() => { setViewId(null); openForm(view); }}><Pencil /> Edit employee</Button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <KV label="Phone"><a href={`tel:${view.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-indigo-700"><Phone size={15} />{view.phone}</a></KV>
            <KV label="Email">{view.email || "—"}</KV>
            <KV label="Reports to">{view.reportsTo || "—"}</KV>
            <KV label="Shift · type">{view.shift} · {view.type}</KV>
            <KV label="Salary structure">{view.structure}</KV>
            <KV label="System role">{view.role}</KV>
            <KV label="Bank">{view.bank || "—"} · {mask(view.accNo)}</KV>
            <KV label="UAN · PAN">{mask(view.uan)} · {mask(view.pan)}</KV>
            <KV label="Electrician licence"><StatusBadge tone={certTone[certState(view.licenceExpiry)]}>{certState(view.licenceExpiry)}</StatusBadge></KV>
            <KV label="Height-safety training"><StatusBadge tone={certTone[certState(view.safetyExpiry)]}>{certState(view.safetyExpiry)}</StatusBadge></KV>
          </div>
        </DetailDialog>
      )}
    </div>
  );
}