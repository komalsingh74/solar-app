"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, AreaField, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, dayLabel, outBtn, thCls } from "@/components/master/module-kit";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";
import { AlertTriangle, CheckCircle2, Eye, Headset, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATS = ["Low generation", "Inverter error", "Net-meter issue", "Wiring / leakage", "Panel cleaning / AMC", "Billing query"];
const PRIO = ["Critical", "High", "Medium", "Low"];
const SLA_H: Record<string, number> = { Critical: 4, High: 24, Medium: 48, Low: 72 };
const WARRANTY = ["In warranty", "AMC", "Out of warranty"];
const FILTERS = ["Open", "Assigned", "In progress", "Resolved", "SLA breached"];
const prioTone: Record<string, Tone> = { Critical: "red", High: "amber", Medium: "indigo", Low: "slate" };
const statusTone: Record<string, Tone> = { Open: "red", Assigned: "amber", "In progress": "indigo", Resolved: "green" };
const warrTone: Record<string, Tone> = { "In warranty": "green", AMC: "indigo", "Out of warranty": "amber" };

type Log = { text: string; at: string };
type Ticket = { id: string; code: string; customerId: string; customer: string; phone: string; projectId: string; project: string; category: string; priority: string; warranty: string; technicianId: string; tech: string; status: string; date: string; time: string; desc: string; resolution: string; log: Log[] };
type Option = { id: string; name: string; phone?: string; customerId?: string };
type ApiRecord = Record<string, unknown>;
const asRecord = (value: unknown): ApiRecord => value && typeof value === "object" ? value as ApiRecord : {};
const asRecords = (value: unknown): ApiRecord[] => Array.isArray(value) ? value.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object") : [];
const blank = (): Ticket => ({ id: "", code: "", customerId: "", customer: "", phone: "", projectId: "", project: "", category: CATS[0], priority: "Medium", warranty: "In warranty", technicianId: "", tech: "Unassigned", status: "Open", date: d(0), time: new Date().toTimeString().slice(0, 5), desc: "", resolution: "", log: [] });
const fromApi = (record: ApiRecord): Ticket => {
  const customer = asRecord(record.customer);
  const project = asRecord(record.project);
  const technician = asRecord(record.technician);
  const createdAt = new Date(String(record.createdAt ?? ""));
  const date = Number.isNaN(createdAt.getTime()) ? "" : `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
  const time = Number.isNaN(createdAt.getTime()) ? "" : `${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}`;
  return {
    id: String(record._id ?? ""), code: String(record.ticketNumber ?? ""),
    customerId: String(customer._id ?? record.customer ?? ""), customer: String(customer.customerName ?? ""),
    phone: String(customer.phone ?? ""), projectId: String(project._id ?? record.project ?? ""),
    project: project._id ? `${String(project.projectCode)} · ${Number(project.systemSizeKw ?? 0)} kW` : "—",
    category: String(record.category ?? ""), priority: String(record.priority ?? "Medium"),
    warranty: String(record.warrantyStatus ?? "In warranty"), technicianId: String(technician._id ?? ""),
    tech: String(technician.name ?? "Unassigned"), status: String(record.status ?? "Open"),
    date, time,
    desc: String(record.description ?? ""), resolution: String(record.resolution ?? ""),
    log: asRecords(record.activity).map((entry) => ({
      text: String(entry.action ?? ""), at: String(entry.at ?? "").replace("T", " ").slice(0, 16),
    })),
  };
};

const dueMs = (t: Ticket) => new Date(`${t.date}T${t.time}`).getTime() + SLA_H[t.priority] * 36e5;
export default function ServicePage() {
  const [list, setList] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [technicians, setTechnicians] = useState<Option[]>([]);
  const [categories, setCategories] = useState<string[]>(CATS);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [now, setNow] = useState(0);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Ticket>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const view = list.find((t) => t.id === viewId);

  const load = useCallback(async () => {
    const [tickets, optionsResponse] = await Promise.all([
      getAllPages<ApiRecord>("/service-tickets"),
      api.get("/service-tickets/options"),
    ]);
    setList(tickets.map(fromApi));
    const data = optionsResponse.data?.data ?? {};
    setCustomers(asRecords(data.customers).map((item) => ({ id: String(item._id), name: String(item.customerName), phone: String(item.phone ?? "") })));
    setProjects(asRecords(data.projects).map((item) => {
      const customer = asRecord(item.customer);
      return { id: String(item._id), name: `${String(item.projectCode)} · ${Number(item.systemSizeKw ?? 0)} kW`, customerId: String(customer._id ?? "") };
    }));
    setTechnicians(asRecords(data.technicians).map((item) => ({ id: String(item._id), name: String(item.name), phone: String(item.phone ?? "") })));
    setCategories(Array.isArray(data.categories) ? data.categories as string[] : CATS);
    setRequestError("");
  }, []);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load service complaints."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);
  const breached = (t: Ticket) => now > 0 && t.status !== "Resolved" && dueMs(t) < now;
  const sla = (t: Ticket): { text: string; tone: Tone } => {
    if (t.status === "Resolved") return { text: "Closed", tone: "green" };
    if (!now) return { text: "—", tone: "slate" };
    const diff = dueMs(t) - now, h = Math.floor(Math.abs(diff) / 36e5), m = Math.floor((Math.abs(diff) % 36e5) / 6e4);
    if (diff < 0) return { text: `Breached ${h >= 24 ? Math.floor(h / 24) + "d" : h + "h"}`, tone: "red" };
    const total = SLA_H[t.priority] * 36e5;
    return { text: h >= 24 ? `${Math.floor(h / 24)}d left` : `${h}h ${m}m left`, tone: diff < total * 0.25 ? "amber" : "slate" };
  };

  const rows = useMemo(
    () => list.filter((t) => (filter === "all" || (filter === "SLA breached" ? breached(t) : t.status === filter)) && `${t.code} ${t.customer} ${t.phone} ${t.category}`.toLowerCase().includes(q.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, q, filter, now],
  );

  const assign = async (id: string, tech: string) => {
    try {
      const technicianId = technicians.find((item) => item.name === tech)?.id ?? "";
      const response = await api.patch(`/service-tickets/${id}/status`, { technicianId });
      setList((current) => current.map((ticket) => ticket.id === id ? fromApi(response.data?.data?.item) : ticket));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not assign technician.");
    }
  };
  const start = async (id: string) => {
    try {
      const response = await api.patch(`/service-tickets/${id}/status`, { status: "In progress" });
      setList((current) => current.map((ticket) => ticket.id === id ? fromApi(response.data?.data?.item) : ticket));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not start service work.");
    }
  };
  const resolve = async (id: string) => {
    try {
      const response = await api.patch(`/service-tickets/${id}/status`, { status: "Resolved", resolution: note });
      setList((current) => current.map((ticket) => ticket.id === id ? fromApi(response.data?.data?.item) : ticket));
      setNote("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not resolve complaint.");
    }
  };
  const remove = async (id: string) => {
    const ticket = list.find((item) => item.id === id);
    if (!ticket || !window.confirm(`Delete complaint ${ticket.code}?`)) return;
    try {
      await api.delete(`/service-tickets/${id}`);
      setList((current) => current.filter((item) => item.id !== id));
      setViewId(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete complaint.");
    }
  };

  const set = (k: "phone" | "category" | "priority" | "warranty" | "tech" | "desc") => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const selectCustomer = (id: string) => {
    const customer = customers.find((item) => item.id === id);
    setDraft((current) => ({ ...current, customerId: id, customer: customer?.name ?? "", phone: customer?.phone ?? "", projectId: "", project: "" }));
  };
  const openForm = (t: Ticket) => { setDraft({ ...t }); setFormOpen(true); };
  const error = !draft.customerId ? "Select a customer." : !draft.desc.trim() ? "Describe the problem." : "";
  const save = async () => {
    if (error) return;
    try {
      const payload = {
        customerId: draft.customerId, projectId: draft.projectId || null, category: draft.category,
        priority: draft.priority, warrantyStatus: draft.warranty,
        technicianId: technicians.find((technician) => technician.name === draft.tech)?.id || null,
        description: draft.desc,
      };
      const response = draft.id
        ? await api.patch(`/service-tickets/${draft.id}`, payload)
        : await api.post("/service-tickets", payload);
      const saved = fromApi(response.data?.data?.item);
      setList((current) => draft.id
        ? current.map((ticket) => ticket.id === draft.id ? saved : ticket)
        : [saved, ...current]);
      setFormOpen(false);
    } catch (reason) {
      const err = reason as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save complaint.");
    }
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Service & complaints" subtitle="Register complaints, assign technicians and resolve them within SLA.">
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank())}><Plus /> New complaint</Button>
      </PageHeader>
      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-4 text-sm text-muted-foreground">Loading service complaints...</Panel>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Headset size={24} />} value={list.filter((t) => t.status !== "Resolved").length} label="Open complaints" />
        <StatCard icon={<AlertTriangle size={24} />} value={list.filter(breached).length} label="SLA breached" />
        <StatCard icon={<CheckCircle2 size={24} />} value={list.filter((t) => t.status === "Resolved").length} label="Resolved" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ticket, customer or issue" aria-label="Search complaints" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All complaints</SelectItem>{FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>{["Complaint", "Issue", "Priority", "Technician", "SLA", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => {
              const s = sla(t);
              return (
                <TableRow key={t.id}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={t.customer} /><div><p className="font-semibold">{t.customer}</p><p className="text-sm text-muted-foreground">{t.code} · {t.project}</p></div></div></TableCell>
                  <TableCell className="max-w-[260px] px-4"><Chip>{t.category}</Chip><p className="mt-1 truncate text-sm text-muted-foreground">{t.desc}</p></TableCell>
                  <TableCell className="px-4"><StatusBadge tone={prioTone[t.priority]}>{t.priority}</StatusBadge></TableCell>
                  <TableCell className={`px-4 ${t.tech === "Unassigned" ? "text-muted-foreground" : ""}`}>{t.tech}</TableCell>
                  <TableCell className={`px-4 text-sm font-medium ${s.tone === "red" ? "text-red-600" : s.tone === "amber" ? "text-amber-600" : s.tone === "green" ? "text-green-700" : "text-slate-600"}`}>{s.text}</TableCell>
                  <TableCell className="px-4"><StatusBadge tone={statusTone[t.status]}>{t.status}</StatusBadge></TableCell>
                  <TableCell className="px-4 text-right">
                    <Button variant="ghost" size="icon" aria-label={`View ${t.code}`} onClick={() => { setNote(""); setViewId(t.id); }}><Eye /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${t.code}`} onClick={() => openForm(t)}><Pencil /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">No complaints match. Change the filter.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? "Edit complaint" : "New complaint"} description="Priority decides the SLA: Critical 4h, High 24h, Medium 48h, Low 72h." error={error} saveLabel="Save complaint" onSave={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 sm:col-span-2">
            <span className="font-semibold text-slate-800">Customer</span>
            <select className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm" value={draft.customerId} onChange={(event) => selectCustomer(event.target.value)}>
              <option value="">Select a customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          {draft.customerId && <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">{draft.customer} · {draft.phone}</p>}
          <label className="grid gap-2 sm:col-span-2">
            <span className="font-semibold text-slate-800">Project / system (optional)</span>
            <select className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm" value={draft.projectId} onChange={(event) => {
              const project = projects.find((item) => item.id === event.target.value);
              setDraft((current) => ({ ...current, projectId: event.target.value, project: project?.name ?? "" }));
            }}>
              <option value="">No linked project</option>
              {projects.filter((project) => project.customerId === draft.customerId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <SelectField label="Category" value={draft.category} onChange={set("category")} options={categories} />
          <SelectField label="Priority" value={draft.priority} onChange={set("priority")} options={PRIO} />
          <SelectField label="Warranty" value={draft.warranty} onChange={set("warranty")} options={WARRANTY} />
          <SelectField label="Technician" value={draft.tech} onChange={set("tech")} options={["Unassigned", ...technicians.map((technician) => technician.name)]} />
          <div className="sm:col-span-2"><AreaField label="Problem description" rows={4} value={draft.desc} onChange={set("desc")} placeholder="Error code, since when, what the customer observed…" /></div>
        </div>
      </SideSheet>

      {view && (
        <DetailDialog wide open onOpenChange={() => setViewId(null)} title={`${view.code} · ${view.customer}`} description={`${view.category} · ${view.project}`}
          footer={<>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
            {view.status !== "Resolved" && <Button variant="outline" size="lg" className={outBtn} onClick={() => { setViewId(null); openForm(view); }}><Pencil /> Edit</Button>}
            <Button variant="outline" size="lg" className={outBtn} onClick={() => void remove(view.id)}><Trash2 /> Delete</Button>
            {(view.status === "Open" || view.status === "Assigned") && <Button size="lg" className={darkBtn} disabled={view.tech === "Unassigned"} onClick={() => void start(view.id)}>Start work</Button>}
          </>}>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <KV label="Status"><StatusBadge tone={statusTone[view.status]}>{view.status}</StatusBadge></KV>
              <KV label="Priority · SLA"><span className="inline-flex items-center gap-2"><StatusBadge tone={prioTone[view.priority]}>{view.priority}</StatusBadge>{sla(view).text}</span></KV>
              <KV label="Warranty"><StatusBadge tone={warrTone[view.warranty]}>{view.warranty}</StatusBadge></KV>
              <KV label="Technician">{view.tech}</KV>
              <KV label="Customer"><a href={`tel:${view.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-indigo-700"><Phone size={15} />{view.phone}</a></KV>
              <KV label="Registered">{dayLabel(view.date)}, {view.time}</KV>
            </div>
            {view.warranty === "Out of warranty" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Out of warranty: this visit is chargeable. Share the estimate before sending a technician.</p>}
            <div><p className="mb-1.5 text-sm font-semibold">Problem</p><p className="text-muted-foreground">{view.desc}</p></div>
            {view.status !== "Resolved" ? (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <SelectField label="Assign technician" value={view.tech} onChange={(v) => void assign(view.id, v)} options={["Unassigned", ...technicians.map((technician) => technician.name)]} />
                <TextField label="Resolution note" value={note} onChange={setNote} placeholder="What was found and fixed" />
                <Button size="lg" className={darkBtn} disabled={!note.trim()} onClick={() => void resolve(view.id)}><CheckCircle2 /> Mark resolved</Button>
              </div>
            ) : <div><p className="mb-1.5 text-sm font-semibold">Resolution</p><p className="text-muted-foreground">{view.resolution}</p></div>}
            <div>
              <p className="mb-2 text-sm font-semibold">Activity</p>
              <ol className="ml-2 border-l-2">
                {view.log.map((l, i) => (
                  <li key={i} className="relative pb-4 pl-6 last:pb-0">
                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-indigo-600" />
                    <p className="text-sm font-medium">{l.text}</p><p className="text-sm text-muted-foreground">{l.at}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </DetailDialog>
      )}
    </div>
  );
}
