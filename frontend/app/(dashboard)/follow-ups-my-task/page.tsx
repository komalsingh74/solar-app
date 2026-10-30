"use client";

import { Avatar, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, AreaField, SelectField, TextField } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, dayLabel, fmtDate, outBtn, pillList, pillTrig } from "@/components/master/module-kit";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, AlertTriangle, CalendarCheck, Check, CheckCircle2, FileText, IndianRupee, MapPin, MessageCircle, Pencil, Phone, Plus, RotateCcw, Search, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { useCustomers } from "@/components/crm/customer-store";

const TYPES = ["Call", "WhatsApp", "Site visit", "Quotation follow-up", "Payment reminder", "Document collection"];
const LINKS = ["Lead", "Customer", "Project"];
const PRIORITIES = ["High", "Medium", "Low"];
const typeIcon = { Call: Phone, WhatsApp: MessageCircle, "Site visit": MapPin, "Quotation follow-up": Send, "Payment reminder": IndianRupee, "Document collection": FileText } as const;
const prioTone: Record<string, Tone> = { High: "red", Medium: "amber", Low: "slate" };

type Log = { text: string; at: string };
type Task = { id: string; title: string; type: string; linkKind: string; linkId: string; linkName: string; phone: string; priority: string; due: string; time: string; assignee: string; assigneeId: string; status: "Open" | "Done"; notes: string; doneOn?: string; log: Log[] };
type EntityOption = { id: string; name: string; phone: string };
type EmployeeOption = { id: string; name: string };

const blank = (): Task => ({ id: "", title: "", type: "Call", linkKind: "Lead", linkId: "", linkName: "", phone: "", priority: "Medium", due: d(0), time: "11:00", assignee: "", assigneeId: "", status: "Open", notes: "", log: [] });

const bucket = (t: Task) => (t.status === "Done" ? "done" : t.due < d(0) ? "overdue" : t.due === d(0) ? "today" : "upcoming");
const daysLate = (t: Task) => Math.round((new Date(d(0)).getTime() - new Date(t.due).getTime()) / 864e5);
const digits = (p: string) => { const x = p.replace(/\D/g, ""); return x.length === 10 ? "91" + x : x; };
const apiToTask = (record: Record<string, unknown>): Task => {
  const assignee = record.assignedTo && typeof record.assignedTo === "object" ? record.assignedTo as Record<string, unknown> : null;
  const dueAt = new Date(String(record.dueAt ?? ""));
  return {
    ...blank(),
    id: String(record._id ?? ""),
    title: String(record.title ?? ""),
    type: String(record.type ?? "Call"),
    linkKind: String(record.linkedTo ?? "Lead"),
    linkId: String(record.linkedId ?? ""),
    linkName: String(record.linkName ?? ""),
    phone: String(record.phone ?? ""),
    priority: String(record.priority ?? "Medium"),
    due: Number.isNaN(dueAt.getTime()) ? "" : `${dueAt.getFullYear()}-${String(dueAt.getMonth() + 1).padStart(2, "0")}-${String(dueAt.getDate()).padStart(2, "0")}`,
    time: String(record.time ?? "11:00"),
    assignee: String(assignee?.name ?? ""),
    assigneeId: String(assignee?._id ?? record.assignedTo ?? ""),
    status: record.status === "completed" ? "Done" : "Open",
    doneOn: record.completedAt ? String(record.completedAt).slice(0, 10) : undefined,
    notes: String(record.notes ?? ""),
    log: Array.isArray(record.activity) ? record.activity.map((entry: Record<string, unknown>) => ({
      text: String(entry.text ?? ""),
      at: entry.at ? new Date(String(entry.at)).toLocaleString("en-IN") : "",
    })) : [],
  };
};

export default function FollowUpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leads, setLeads] = useState<EntityOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [customerStore] = useCustomers();
  const [tab, setTab] = useState("today");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("mine");
  const [type, setType] = useState("all");
  const [draft, setDraft] = useState<Task>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const view = tasks.find((t) => t.id === viewId);

  const loadTasks = async () => {
    const [taskResponse, optionsResponse, userResponse, leadResponse] = await Promise.all([
      api.get("/follow-ups", { params: { page: 1, limit: 100 } }),
      api.get("/follow-ups/options"),
      api.get("/users/me"),
      api.get("/leads", { params: { page: 1, limit: 100 } }),
    ]);
    const items = taskResponse.data?.data?.items;
    if (!Array.isArray(items)) throw new Error("The server returned an invalid follow-up list.");
    const taskPages = Number(taskResponse.data?.data?.pagination?.pages) || 1;
    const moreTaskPages = await Promise.all(Array.from({ length: Math.max(0, taskPages - 1) }, (_, index) =>
      api.get("/follow-ups", { params: { page: index + 2, limit: 100 } })
    ));
    const allTasks = [...items, ...moreTaskPages.flatMap((response) => {
      const pageItems = response.data?.data?.items;
      if (!Array.isArray(pageItems)) throw new Error("The server returned an invalid follow-up list.");
      return pageItems;
    })];
    setTasks(allTasks.filter((item: Record<string, unknown>) => item.status !== "cancelled").map((item: Record<string, unknown>) => apiToTask(item)));
    setEmployees((optionsResponse.data?.data?.employees ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.name) })));
    setCurrentUserId(String(userResponse.data?.data?.user?.id ?? userResponse.data?.data?.user?._id ?? ""));
    setCurrentUserName(String(userResponse.data?.data?.user?.name ?? ""));
    const leadItems = leadResponse.data?.data?.items;
    if (!Array.isArray(leadItems)) throw new Error("The server returned an invalid lead list.");
    const leadPages = Number(leadResponse.data?.data?.pagination?.pages) || 1;
    const moreLeadPages = await Promise.all(Array.from({ length: Math.max(0, leadPages - 1) }, (_, index) =>
      api.get("/leads", { params: { page: index + 2, limit: 100 } })
    ));
    const allLeads = [...leadItems, ...moreLeadPages.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid lead list.");
      return items;
    })];
    setLeads(allLeads.map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.name ?? ""), phone: String(item.phone ?? "") })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    loadTasks().catch((error: { userMessage?: string; message?: string }) => {
      if (active) setRequestError(error.userMessage || error.message || "Could not load follow-ups.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const customers = customerStore.customers.map((customer) => ({ id: customer.apiId ?? "", name: customer.name, phone: customer.phone })).filter((customer) => customer.id);

  const scoped = useMemo(
    () => tasks.filter((t) => (scope === "team" || t.assigneeId === currentUserId) && (type === "all" || t.type === type) && `${t.title} ${t.linkName} ${t.phone}`.toLowerCase().includes(q.toLowerCase())),
    [tasks, scope, type, q, currentUserId],
  );
  const by = (b: string) => scoped.filter((t) => bucket(t) === b).sort((a, c) => (b === "done" ? (c.doneOn ?? "").localeCompare(a.doneOn ?? "") : (a.due + a.time).localeCompare(c.due + c.time)));
  const lists = { overdue: by("overdue"), today: by("today"), upcoming: by("upcoming"), done: by("done") };
  const rows = lists[tab as keyof typeof lists];

  const saveTask = async (task: Task, extra: Record<string, unknown> = {}) => {
    const dueAt = new Date(`${task.due}T${task.time || "00:00"}:00`).toISOString();
    const payload = {
      title: task.title,
      type: task.type,
      priority: task.priority,
      linkedTo: task.linkKind,
      linkedId: task.linkId || null,
      linkName: task.linkName,
      phone: task.phone,
      dueAt,
      time: task.time,
      assignedTo: task.assigneeId || null,
      notes: task.notes,
      ...extra,
    };
    const response = task.id
      ? await api.patch(`/follow-ups/${task.id}`, payload)
      : await api.post("/follow-ups", payload);
    const saved = apiToTask(response.data?.data?.item);
    setTasks((current) => task.id
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]);
    return saved;
  };
  const updateTask = async (id: string, changes: Partial<Task>, extra: Record<string, unknown> = {}) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return false;
    setRequestError("");
    try {
      await saveTask({ ...current, ...changes }, extra);
      return true;
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update follow-up.");
      return false;
    }
  };
  const complete = (id: string) => void updateTask(id, {}, { status: "completed" });
  const reopen = (id: string) => void updateTask(id, {}, { status: "pending" });
  const snooze = (id: string, days: number) => void updateTask(id, { due: d(days) });
  const openForm = (task: Task) => { setDraft({ ...task }); setFormOpen(true); };
  const doneAndNext = async (task: Task) => {
    if (!await updateTask(task.id, {}, { status: "completed" })) return;
    setViewId(null);
    openForm({ ...blank(), title: `Follow up: ${task.linkName}`, type: task.type, linkKind: task.linkKind, linkId: task.linkId, linkName: task.linkName, phone: task.phone, assignee: task.assignee, assigneeId: task.assigneeId, due: d(3) });
  };

  const set = (k: keyof Task) => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const error = !draft.title.trim() ? "Task title is required." : !draft.linkName.trim() ? "Add the lead / customer / project name." : !draft.due ? "Pick a due date." : "";
  const save = async () => {
    if (error) return;
    setSaving(true);
    setRequestError("");
    try {
      await saveTask(draft);
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const mine = tasks.filter((t) => t.assigneeId === currentUserId && t.status === "Open");
  const doneWeek = tasks.filter((t) => t.assigneeId === currentUserId && t.status === "Done" && (t.doneOn ?? "") >= d(-6)).length;
  const removeTask = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setRequestError("");
    try {
      await api.delete(`/follow-ups/${task.id}`);
      setTasks((current) => current.filter((entry) => entry.id !== task.id));
      setViewId(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete follow-up.");
    }
  };

  const Row = ({ t }: { t: Task }) => {
    const Icon = typeIcon[t.type as keyof typeof typeIcon] ?? Phone;
    const done = t.status === "Done", late = bucket(t) === "overdue";
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70 sm:flex-nowrap">
        <button aria-label={done ? "Reopen task" : "Mark done"} onClick={() => (done ? reopen(t.id) : complete(t.id))}
          className={`grid h-6 w-6 flex-none place-items-center rounded-full border-2 transition ${done ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent hover:border-indigo-600 hover:text-indigo-600"}`}>
          <Check size={14} />
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setViewId(t.id)}>
          <p className={`truncate font-semibold ${done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Icon size={14} />{t.type}</span><span>·</span><span>{t.linkKind}: {t.linkName}</span>
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex"><Avatar name={t.assignee} /><span className="text-sm">{t.assignee.split(" ")[0]}</span></div>
        <StatusBadge tone={prioTone[t.priority]}>{t.priority}</StatusBadge>
        <div className="w-28 text-right text-sm">
          {done ? <p className="text-muted-foreground">Done {dayLabel(t.doneOn ?? "")}</p> : <>
            <p className={`font-medium ${late ? "text-red-600" : bucket(t) === "today" ? "text-indigo-600" : ""}`}>{late ? `${daysLate(t)}d overdue` : dayLabel(t.due)}</p>
            <p className="text-muted-foreground">{t.time}</p>
          </>}
        </div>
        <div className="flex flex-none items-center">
          <a className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} aria-label={`Call ${t.linkName}`} href={`tel:${t.phone.replace(/\s/g, "")}`}><Phone /></a>
          <a className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} aria-label={`WhatsApp ${t.linkName}`} href={`https://wa.me/${digits(t.phone)}`} target="_blank" rel="noreferrer"><MessageCircle /></a>
          {!done && <Button variant="ghost" size="icon" aria-label="Snooze to tomorrow" title="Snooze to tomorrow" onClick={() => snooze(t.id, 1)}><AlarmClock /></Button>}
          <Button variant="ghost" size="icon" aria-label={`Edit ${t.title}`} onClick={() => openForm(t)}><Pencil /></Button>
        </div>
      </li>
    );
  };

  const TABS: [string, string][] = [["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["done", "Completed"]];
  const empty = { overdue: "Nothing overdue. Great work.", today: "No follow-ups due today.", upcoming: "No upcoming follow-ups scheduled.", done: "No completed tasks yet." }[tab];

  return (
    <div className="!space-y-2">
      <PageHeader title="Follow-ups / my tasks" subtitle="Every call, visit and reminder you owe a lead, customer or project, in one list.">
        <Button size="lg" className={darkBtn} disabled={loading} onClick={() => openForm({ ...blank(), assignee: currentUserName, assigneeId: currentUserId })}><Plus /> Add task</Button>
      </PageHeader>

      {requestError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<CalendarCheck size={24} />} value={mine.filter((t) => t.due === d(0)).length} label="My follow-ups today" />
        <StatCard icon={<AlertTriangle size={24} />} value={mine.filter((t) => t.due < d(0)).length} label="My overdue tasks" />
        <StatCard icon={<CheckCircle2 size={24} />} value={doneWeek} label="Completed this week" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={pillList}>
              {TABS.map(([v, l]) => (
                <TabsTrigger key={v} value={v} className={pillTrig}>
                  {l}
                  <span className={`ml-2 rounded-full px-1.5 text-xs font-semibold ${v === "overdue" && lists.overdue.length ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"}`}>{lists[v as keyof typeof lists].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative min-w-[200px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search task, name or phone" aria-label="Search tasks" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200 bg-slate-50" aria-label="Scope"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mine">My tasks</SelectItem><SelectItem value="team">Whole team</SelectItem></SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by type"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All types</SelectItem>{TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {rows.length ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">{rows.map((t) => <Row key={t.id} t={t} />)}</ul>
        ) : (
          <div className="border-t border-slate-100 py-16 text-center text-muted-foreground">{loading ? "Loading follow-ups..." : empty}</div>
        )}
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? "Edit task" : "New task"} description="What needs to be done, for whom, and by when." error={error} busy={saving} saveLabel="Save task" onSave={() => void save()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Task" value={draft.title} onChange={set("title")} placeholder="Call to confirm site visit" />
          <SelectField label="Type" value={draft.type} onChange={set("type")} options={TYPES} />
          <SelectField label="Priority" value={draft.priority} onChange={set("priority")} options={PRIORITIES} />
          <SelectField label="Linked to" value={draft.linkKind} onChange={(value) => setDraft((current) => ({ ...current, linkKind: value, linkId: "", linkName: "", phone: "" }))} options={LINKS} />
          {draft.linkKind !== "Project"
            ? <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">{draft.linkKind} name
                <select value={draft.linkId} onChange={(event) => {
                  const options = draft.linkKind === "Lead" ? leads : customers;
                  const selected = options.find((option) => option.id === event.target.value);
                  setDraft((current) => ({ ...current, linkId: selected?.id ?? "", linkName: selected?.name ?? "", phone: selected?.phone ?? "" }));
                }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                  <option value="">Select {draft.linkKind.toLowerCase()}</option>
                  {(draft.linkKind === "Lead" ? leads : customers).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            : <TextField label="Project name" value={draft.linkName} onChange={set("linkName")} placeholder="Project name" />}
          <TextField label="Phone" type="tel" value={draft.phone} onChange={set("phone")} />
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">Assigned to
            <select value={draft.assigneeId} onChange={(event) => {
              const selected = employees.find((employee) => employee.id === event.target.value);
              setDraft((current) => ({ ...current, assigneeId: selected?.id ?? "", assignee: selected?.name ?? "" }));
            }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
              <option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </label>
          <TextField label="Due date" type="date" value={draft.due} onChange={set("due")} />
          <TextField label="Time" type="time" value={draft.time} onChange={set("time")} />
          <div className="sm:col-span-2"><AreaField label="Notes" rows={4} value={draft.notes} onChange={set("notes")} placeholder="What to say, what to carry, what the customer asked…" /></div>
        </div>
      </SideSheet>

      {view && (
        <DetailDialog wide open onOpenChange={() => setViewId(null)} title={view.title} description={`${view.type} · ${view.linkKind}: ${view.linkName}`}
          footer={<>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => { setViewId(null); openForm(view); }}><Pencil /> Edit</Button>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => void removeTask(view)}><AlertTriangle /> Delete</Button>
            {view.status === "Open"
              ? <>
                  <Button variant="outline" size="lg" className={outBtn} onClick={() => complete(view.id)}><Check /> Mark done</Button>
                  <Button size="lg" className={darkBtn} onClick={() => doneAndNext(view)}>Done & schedule next</Button>
                </>
              : <Button size="lg" className={darkBtn} onClick={() => reopen(view.id)}><RotateCcw /> Reopen</Button>}
          </>}>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <KV label="Status"><StatusBadge tone={view.status === "Done" ? "green" : bucket(view) === "overdue" ? "red" : "indigo"}>{view.status === "Done" ? "Completed" : bucket(view) === "overdue" ? "Overdue" : "Open"}</StatusBadge></KV>
              <KV label="Priority"><StatusBadge tone={prioTone[view.priority]}>{view.priority}</StatusBadge></KV>
              <KV label="Due">{dayLabel(view.due)}, {view.time}</KV>
              <KV label="Assigned to">{view.assignee}</KV>
              <KV label="Contact">
                <span className="inline-flex flex-wrap items-center gap-3">
                  <a href={`tel:${view.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-indigo-700"><Phone size={15} />{view.phone}</a>
                  <a href={`https://wa.me/${digits(view.phone)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-green-700"><MessageCircle size={15} />WhatsApp</a>
                </span>
              </KV>
            </div>
            {view.status === "Open" && (
              <div>
                <p className="mb-2 text-sm font-semibold">Snooze</p>
                <div className="flex flex-wrap gap-2">
                  {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, n]) => (
                    <Button key={l as string} variant="outline" size="sm" className="rounded-lg border-slate-200" onClick={() => snooze(view.id, n as number)}><AlarmClock /> {l}</Button>
                  ))}
                </div>
              </div>
            )}
            <div><p className="mb-1.5 text-sm font-semibold">Notes</p><p className="text-muted-foreground">{view.notes || "No notes yet."}</p></div>
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
