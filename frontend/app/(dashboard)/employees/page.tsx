"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, fmtDate, outBtn, thCls } from "@/components/master/module-kit";
import { ROLES, certState, type Employee } from "@/components/hr/hr-store";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Phone, Plus, Search, ShieldAlert, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataPagination from "@/components/common/data-pagination";
import api from "@/lib/api";
import Loader from "@/components/common/Loader";
import EmployeePicker, { type EmployeeOption } from "@/components/hr/employee-picker";

const certTone: Record<string, Tone> = { Valid: "green", Expiring: "amber", Expired: "red", "—": "slate" };
const mask = (s: string) => (s ? "••••" + s.slice(-4) : "—");
type EmployeeRecord = Omit<Employee, "id"> & { id: string; reportsToId: string };
const fromApi = (record: Record<string, unknown>): EmployeeRecord => {
  const manager = record.reportsTo && typeof record.reportsTo === "object" ? record.reportsTo as Record<string, unknown> : null;
  const legacyManager = record.reportsToUserId && typeof record.reportsToUserId === "object" ? record.reportsToUserId as Record<string, unknown> : null;
  const date = (value: unknown) => value ? String(value).slice(0, 10) : "";
  return {
    id: String(record._id ?? ""), code: String(record.employeeCode ?? ""), name: String(record.fullName ?? ""),
    phone: String(record.phone ?? ""), email: String(record.email ?? ""), dept: String(record.department ?? "Other"),
    designation: String(record.designation ?? ""), type: String(record.employmentType ?? "Full-time"),
    joined: date(record.joiningDate), status: String(record.status ?? "Active"), reportsTo: String(manager?.fullName ?? legacyManager?.name ?? ""),
    reportsToId: String(manager?._id ?? legacyManager?._id ?? ""), shift: String(record.shift ?? "General"), role: String(record.systemRole ?? "Employee"),
    structure: ["Staff", "Worker", "Contract"].includes(String(record.salaryStructure)) ? String(record.salaryStructure) : "Staff",
    gross: Number(record.monthlyGrossSalary ?? 0), pan: String(record.pan ?? ""),
    uan: String(record.uan ?? ""), bank: String(record.bankName ?? ""), accNo: String(record.accountNumber ?? ""),
    ifsc: String(record.ifsc ?? ""), licenceExpiry: date(record.electricianLicenseExpiry),
    safetyExpiry: date(record.heightSafetyTrainingExpiry),
  };
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const blank = (): EmployeeRecord => ({ id: "", code: "", name: "", phone: "", email: "", dept: "Sales", designation: "", type: "Full-time", joined: d(0), status: "Active", reportsTo: "", reportsToId: "", shift: "General", role: "Employee", structure: "Staff", gross: 0, pan: "", uan: "", bank: "", accNo: "", ifsc: "", licenceExpiry: "", safetyExpiry: "" });
  const [draft, setDraft] = useState<EmployeeRecord>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const view = employees.find((e) => e.id === viewId);

  const load = async () => {
    const first = await api.get("/employees", { params: { page: 1, limit: 100 } });
    const items = first.data?.data?.items;
    if (!Array.isArray(items)) throw new Error("The server returned an invalid employee list.");
    const pages = Number(first.data?.data?.pagination?.pages) || 1;
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      api.get("/employees", { params: { page: index + 2, limit: 100 } })
    ));
    const all = [...items, ...rest.flatMap((response) => {
      const pageItems = response.data?.data?.items;
      if (!Array.isArray(pageItems)) throw new Error("The server returned an invalid employee list.");
      return pageItems;
    })];
    setEmployees(all.map((record: Record<string, unknown>) => fromApi(record)));
    setRequestError("");
  };
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => {
      if (active) setRequestError(error.userMessage || error.message || "Could not load employees.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => employees.filter((e) => (dept === "all" || e.dept === dept) && `${e.name} ${e.code} ${e.phone} ${e.designation}`.toLowerCase().includes(q.toLowerCase())), [employees, q, dept]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const set = (k: keyof EmployeeRecord) => (v: string) => setDraft((x) => ({ ...x, [k]: k === "gross" ? Number(v) : v }));
  const openForm = (e: EmployeeRecord) => { setDraft({ ...e }); setFormOpen(true); };
  const error = !draft.name.trim() || !draft.phone.trim() ? "Name and phone are required." : !Number.isFinite(draft.gross) || draft.gross < 0 ? "Enter a non-negative monthly gross salary." : "";
  const save = async () => {
    if (error) return;
    setSaving(true);
    setRequestError("");
    try {
      const reportsToIsEmployee = employees.some((employee) => employee.id === draft.reportsToId);
      const payload = {
        fullName: draft.name, phone: draft.phone, email: draft.email, pan: draft.pan, uan: draft.uan,
        joiningDate: draft.joined || null, department: draft.dept, designation: draft.designation,
        employmentType: draft.type, ...(draft.reportsToId && !reportsToIsEmployee ? {} : { reportsTo: draft.reportsToId || null }), shift: draft.shift,
        systemRole: draft.role, status: draft.status, electricianLicenseExpiry: draft.licenceExpiry || null,
        heightSafetyTrainingExpiry: draft.safetyExpiry || null, salaryStructure: draft.structure,
        monthlyGrossSalary: draft.gross, bankName: draft.bank, accountNumber: draft.accNo, ifsc: draft.ifsc,
      };
      const response = draft.id ? await api.patch(`/employees/${draft.id}`, payload) : await api.post("/employees", payload);
      const saved = fromApi(response.data?.data?.item);
      setEmployees((current) => draft.id
        ? current.map((employee) => employee.id === saved.id ? saved : employee)
        : [saved, ...current]);
      if (!draft.id) setPage(1);
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save employee.");
    } finally {
      setSaving(false);
    }
  };
  const certDue = (e: EmployeeRecord) => [certState(e.licenceExpiry), certState(e.safetyExpiry)].some((c) => c === "Expired" || c === "Expiring");

  return (
    <div className="!space-y-2">
      <PageHeader title="Employees" subtitle="Manage employee records, assignments, payroll and certificates.">
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank())}><Plus /> Add employee</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users size={24} />} value={employees.length} label="Total employees" />
        <StatCard icon={<UserCheck size={24} />} value={employees.filter((e) => e.status === "Active").length} label="Active" />
        <StatCard icon={<ShieldAlert size={24} />} value={employees.filter(certDue).length} label="Certificates to renew" />
      </div>

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, ID, phone or designation" aria-label="Search employees" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={dept || null} onValueChange={(value) => { setDept(value ?? ""); setPage(1); }}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by department"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All departments</SelectItem>{[...new Set(employees.map((employee) => employee.dept))].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Employee", "Department", "Reports to", "Shift", "Joined", "Certificates", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow></TableHeader>
          <TableBody>
            {paginatedRows.map((e) => (
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
            {loading ? <TableRow><TableCell colSpan={8} className="py-14 text-center"><Loader type="inline" text="Loading employees..." /></TableCell></TableRow> : rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No employees match.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <DataPagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? "Edit employee" : "New employee"} description="This record feeds attendance, payroll, shifts and crews." error={error} busy={saving} saveLabel="Save employee" onSave={() => void save()}>
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
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Employee code<input readOnly value={draft.code || "Generated when saved"} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" /></label>
            <TextField label="Joining date" type="date" value={draft.joined} onChange={set("joined")} />
            <SelectField label="Department" value={draft.dept} onChange={set("dept")} options={["Sales", "Installation", "Service", "Purchase", "Accounts", "HR", "Management", "Other"]} />
            <TextField label="Designation" value={draft.designation} onChange={set("designation")} />
            <SelectField label="Employment type" value={draft.type} onChange={set("type")} options={["Full-time", "Part-time", "Contract", "Temporary"]} />
            <EmployeePicker label="Reports to" value={draft.reportsToId} includeUnassigned placeholder="Select reporting employee"
              options={employees.filter((employee) => employee.id !== draft.id && employee.status === "Active").map((employee): EmployeeOption => ({
                id: employee.id, name: employee.name, code: employee.code, designation: employee.designation, department: employee.dept, role: employee.role,
              }))}
              fallbackName={draft.reportsTo}
              onChange={(reportsToId) => {
                const manager = employees.find((employee) => employee.id === reportsToId);
                setDraft((current) => ({ ...current, reportsToId, reportsTo: manager?.name ?? "" }));
              }} />
            <SelectField label="Shift" value={draft.shift} onChange={set("shift")} options={["General", "Morning", "Evening", "Night"]} />
            <SelectField label="System role" value={draft.role} onChange={set("role")} options={ROLES} />
            <SelectField label="Status" value={draft.status} onChange={set("status")} options={["Active", "Inactive", "Resigned", "Terminated"]} />
            <TextField label="Electrician licence expiry" type="date" value={draft.licenceExpiry} onChange={set("licenceExpiry")} />
            <TextField label="Height-safety training expiry" type="date" value={draft.safetyExpiry} onChange={set("safetyExpiry")} />
          </TabsContent>
          <TabsContent value="pay" className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Salary structure" value={draft.structure} onChange={set("structure")} options={["Staff", "Worker", "Contract"]} />
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