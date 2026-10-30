"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, AreaField, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, dayLabel, fmtDate, outBtn, thCls } from "@/components/master/module-kit";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Eye, Hammer, Pencil, Plus, Search, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";

const STAGES = ["Survey approved", "Material dispatched", "Structure", "Panels mounted", "Wiring & inverter", "Net-meter & inspection", "Commissioned"];
const NET = ["Not applied", "Applied", "Approved", "Installed"];
const SUBSIDY = ["Not applicable", "Applied", "Approved", "Received"];
const FILTERS = ["On track", "Delayed", "Completed"];
const statusTone: Record<string, Tone> = { "On track": "indigo", Delayed: "red", Completed: "green" };
const netTone: Record<string, Tone> = { "Not applied": "slate", Applied: "amber", Approved: "indigo", Installed: "green" };

type Option = { id: string; name: string };
type SurveyOption = { id: string; customerId: string; name: string };
type Project = { id: string; customerId: string; surveyId: string; engineerId: string; teamId: string; code: string; customer: string; location: string; kw: string; stage: string; engineer: string; crew: string; start: string; target: string; netMeter: string; subsidy: string; notes: string };
const blank = (): Project => ({ id: "", customerId: "", surveyId: "", engineerId: "", teamId: "", code: "", customer: "", location: "", kw: "5", stage: STAGES[0], engineer: "", crew: "", start: d(0), target: d(14), netMeter: "Not applied", subsidy: "Not applicable", notes: "" });
const asDate = (value: unknown) => value ? new Date(String(value)).toISOString().slice(0, 10) : "";
const fromApi = (record: Record<string, unknown>): Project => {
  const customer = record.customer && typeof record.customer === "object" ? record.customer as Record<string, unknown> : null;
  const engineer = record.engineer && typeof record.engineer === "object" ? record.engineer as Record<string, unknown> : null;
  const team = record.installationTeam && typeof record.installationTeam === "object" ? record.installationTeam as Record<string, unknown> : null;
  const survey = record.siteSurvey && typeof record.siteSurvey === "object" ? record.siteSurvey as Record<string, unknown> : null;
  return {
    ...blank(), id: String(record._id ?? ""), code: String(record.projectCode ?? ""),
    customerId: String(customer?._id ?? record.customer ?? ""), customer: String(customer?.customerName ?? ""),
    surveyId: String(survey?._id ?? record.siteSurvey ?? ""),
    location: String(record.siteAddress ?? ""), kw: String(record.systemSizeKw ?? "5"),
    stage: String(record.stage ?? STAGES[0]), engineerId: String(engineer?._id ?? record.engineer ?? ""),
    engineer: String(engineer?.name ?? ""), teamId: String(team?._id ?? record.installationTeam ?? ""),
    crew: String(team?.teamName ?? ""), start: asDate(record.startDate), target: asDate(record.targetDate),
    netMeter: String(record.netMeteringStatus ?? "Not applied"), subsidy: String(record.subsidyStatus ?? "Not applicable"),
    notes: String(record.notes ?? ""),
  };
};

const idx = (p: Project) => STAGES.indexOf(p.stage);
const pct = (p: Project) => Math.round(((idx(p) + 1) / STAGES.length) * 100);
const state = (p: Project) => (idx(p) === STAGES.length - 1 ? "Completed" : p.target < d(0) ? "Delayed" : "On track");

export default function ProjectsPage() {
  const [list, setList] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [engineers, setEngineers] = useState<Option[]>([]);
  const [teams, setTeams] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Project>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const view = list.find((p) => p.id === viewId);

  const load = async () => {
    const [records, optionsResponse] = await Promise.all([getAllPages<Record<string, unknown>>("/solar-projects"), api.get("/solar-projects/options")]);
    setList(records.map((record) => fromApi(record)));
    const options = optionsResponse.data?.data;
    setCustomers((options?.customers ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.customerName) })));
    setSurveys((options?.surveys ?? []).map((item: Record<string, unknown>) => {
      const customer = item.customer && typeof item.customer === "object" ? item.customer as Record<string, unknown> : null;
      return { id: String(item._id), customerId: String(customer?._id ?? ""), name: String(item.surveyNumber ?? item._id) };
    }));
    setEngineers((options?.engineers ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.name) })));
    setTeams((options?.teams ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.teamName) })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load projects."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(
    () => list.filter((p) => (filter === "all" || state(p) === filter) && `${p.code} ${p.customer} ${p.location} ${p.engineer}`.toLowerCase().includes(q.toLowerCase())),
    [list, q, filter],
  );
  const set = (k: keyof Project) => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const openForm = (p: Project) => { setDraft({ ...p }); setFormOpen(true); };
  const error = !draft.customerId ? "Select a customer." : !draft.location.trim() ? "Site address is required." : !(Number(draft.kw) > 0) ? "Enter system size in kW." : draft.target < draft.start ? "Target date is before start date." : "";
  const save = async () => {
    if (error) return;
    setBusy(true);
    setRequestError("");
    try {
      const payload = {
        customerId: draft.customerId, siteSurveyId: draft.surveyId || null, siteAddress: draft.location, systemSizeKw: Number(draft.kw),
        stage: draft.stage, engineerId: draft.engineerId || null, installationTeamId: draft.teamId || null,
        startDate: draft.start, targetDate: draft.target, netMeteringStatus: draft.netMeter,
        subsidyStatus: draft.subsidy, notes: draft.notes,
      };
      const response = draft.id ? await api.patch(`/solar-projects/${draft.id}`, payload) : await api.post("/solar-projects", payload);
      const saved = fromApi(response.data?.data?.item);
      setList((current) => draft.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save project.");
    } finally { setBusy(false); }
  };
  const advance = async (project: Project) => {
    const next = STAGES[idx(project) + 1];
    if (!next) return;
    try {
      const response = await api.patch(`/solar-projects/${project.id}`, { stage: next });
      const saved = fromApi(response.data?.data?.item);
      setList((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (viewId === project.id) setViewId(saved.id);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update project stage.");
    }
  };
  const remove = async (project: Project) => {
    if (!window.confirm(`Delete ${project.code}?`)) return;
    try {
      await api.delete(`/solar-projects/${project.id}`);
      setList((current) => current.filter((item) => item.id !== project.id));
      if (viewId === project.id) setViewId(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete project.");
    }
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Solar projects / installations" subtitle="Track every site from material dispatch to commissioning, with net-meter and subsidy status.">
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank())}><Plus /> New project</Button>
      </PageHeader>

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-5 text-sm text-muted-foreground">Loading projects…</Panel>}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Hammer size={24} />} value={list.filter((p) => state(p) !== "Completed").length} label="Active projects" />
        <StatCard icon={<AlertTriangle size={24} />} value={list.filter((p) => state(p) === "Delayed").length} label="Delayed" />
        <StatCard icon={<Sun size={24} />} value={`${list.filter((p) => state(p) === "Completed").reduce((a, p) => a + Number(p.kw), 0)} kW`} label="Commissioned capacity" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by project, customer or engineer" aria-label="Search projects" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={filter || null} onValueChange={(value) => setFilter(value ?? "")}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All projects</SelectItem>{FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>{["Project", "Size", "Site engineer", "Progress", "Target", "Net-meter", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={p.customer} /><div><p className="font-semibold">{p.customer}</p><p className="text-sm text-muted-foreground">{p.code} · {p.location}</p></div></div></TableCell>
                <TableCell className="px-4"><Chip>{p.kw} kW</Chip></TableCell>
                <TableCell className="px-4"><p>{p.engineer}</p>{p.crew && <p className="text-sm text-muted-foreground">{p.crew}</p>}</TableCell>
                <TableCell className="px-4">
                  <div className="h-2 w-32 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${state(p) === "Completed" ? "bg-green-600" : "bg-indigo-600"}`} style={{ width: `${pct(p)}%` }} /></div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.stage}</p>
                </TableCell>
                <TableCell className={`px-4 ${state(p) === "Delayed" ? "font-semibold text-red-600" : ""}`}>{fmtDate(p.target)}</TableCell>
                <TableCell className="px-4"><StatusBadge tone={netTone[p.netMeter]}>{p.netMeter}</StatusBadge></TableCell>
                <TableCell className="px-4"><StatusBadge tone={statusTone[state(p)]}>{state(p)}</StatusBadge></TableCell>
                <TableCell className="px-4 text-right">
                  <Button variant="ghost" size="icon" aria-label={`View ${p.code}`} onClick={() => setViewId(p.id)}><Eye /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${p.code}`} onClick={() => openForm(p)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${p.code}`} onClick={() => void remove(p)}><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No projects match. Change the filter or add a new project.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? "Edit project" : "New project"} description="Site, schedule and approval details." error={error} saveLabel={busy ? "Saving…" : "Save project"} onSave={save}>
        <Tabs defaultValue="project">
          <TabsList className={tabsListCls}>
            <TabsTrigger value="project" className={tabCls}>Project</TabsTrigger>
            <TabsTrigger value="schedule" className={tabCls}>Schedule</TabsTrigger>
            <TabsTrigger value="approvals" className={tabCls}>Approvals</TabsTrigger>
          </TabsList>
          <TabsContent value="project" className="grid gap-4 sm:grid-cols-2">
            {draft.code && <TextField label="Project code" value={draft.code} onChange={() => undefined} disabled />}
            <TextField label="System size (kW)" type="number" min={0} value={draft.kw} onChange={set("kw")} />
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-800">Customer</label>
              <Select value={draft.customerId || null} onValueChange={(id) => {
                const customer = customers.find((entry) => entry.id === id);
                setDraft((current) => ({ ...current, customerId: id ?? "", customer: customer?.name ?? "", surveyId: "" }));
              }}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2"><label className="text-sm font-semibold text-slate-800">Completed site survey (optional)</label><Select value={draft.surveyId || null} onValueChange={(id) => setDraft((current) => ({ ...current, surveyId: id ?? "" }))}><SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select a completed survey" /></SelectTrigger><SelectContent>{surveys.filter((survey) => survey.customerId === draft.customerId).map((survey) => <SelectItem key={survey.id} value={survey.id}>{survey.name}</SelectItem>)}</SelectContent></Select></div>
            <TextField className="sm:col-span-2" label="Site address" value={draft.location} onChange={set("location")} placeholder="Area, city" />
            <div className="grid gap-2"><label className="text-sm font-semibold text-slate-800">Site engineer</label><Select value={draft.engineerId || null} onValueChange={(id) => setDraft((current) => ({ ...current, engineerId: id ?? "", engineer: engineers.find((entry) => entry.id === id)?.name ?? "" }))}><SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select engineer" /></SelectTrigger><SelectContent>{engineers.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><label className="text-sm font-semibold text-slate-800">Installation team</label><Select value={draft.teamId || null} onValueChange={(id) => setDraft((current) => ({ ...current, teamId: id ?? "", crew: teams.find((entry) => entry.id === id)?.name ?? "" }))}><SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select team" /></SelectTrigger><SelectContent>{teams.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent></Select></div>
          </TabsContent>
          <TabsContent value="schedule" className="grid gap-4 sm:grid-cols-2">
            <SelectField className="sm:col-span-2" label="Current stage" value={draft.stage} onChange={set("stage")} options={STAGES} />
            <TextField label="Start date" type="date" value={draft.start} onChange={set("start")} />
            <TextField label="Target completion" type="date" value={draft.target} onChange={set("target")} />
          </TabsContent>
          <TabsContent value="approvals" className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Net-meter" value={draft.netMeter} onChange={set("netMeter")} options={NET} />
            <SelectField label="Subsidy" value={draft.subsidy} onChange={set("subsidy")} options={SUBSIDY} />
            <div className="sm:col-span-2"><AreaField label="Notes" rows={5} value={draft.notes} onChange={set("notes")} placeholder="Material pending, customer requests, issues…" /></div>
          </TabsContent>
        </Tabs>
      </SideSheet>

      {view && (
        <DetailDialog wide open onOpenChange={() => setViewId(null)} title={`${view.customer} · ${view.kw} kW`} description={`${view.code} · ${view.location}`}
          footer={<>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => { setViewId(null); openForm(view); }}><Pencil /> Edit</Button>
            {idx(view) < STAGES.length - 1 && <Button size="lg" className={darkBtn} onClick={() => void advance(view)}><Check /> Mark “{STAGES[idx(view) + 1]}”</Button>}
          </>}>
          <div className="grid gap-6 sm:grid-cols-[1fr_1.1fr]">
            <div className="space-y-3">
              <KV label="Status"><StatusBadge tone={statusTone[state(view)]}>{state(view)}</StatusBadge></KV>
              <KV label="Site engineer">{view.engineer}{view.crew ? ` · ${view.crew}` : ""}</KV>
              <KV label="Start → target">{fmtDate(view.start)} → {fmtDate(view.target)} ({dayLabel(view.target)})</KV>
              <KV label="Net-meter"><StatusBadge tone={netTone[view.netMeter]}>{view.netMeter}</StatusBadge></KV>
              <KV label="Subsidy">{view.subsidy}</KV>
              {view.notes && <KV label="Notes">{view.notes}</KV>}
            </div>
            <ol className="ml-2 border-l-2">
              {STAGES.map((s, i) => {
                const done = i < idx(view) + 1, current = i === idx(view);
                return (
                  <li key={s} className="relative pb-4 pl-6 last:pb-0">
                    <span className={`absolute -left-[9px] top-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-background ${done ? "bg-indigo-600" : "bg-slate-300"} ${current && idx(view) < STAGES.length - 1 ? "ring-4 ring-indigo-100" : ""}`}>
                      {done && <Check size={10} className="text-white" />}
                    </span>
                    <p className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{s}</p>
                    {current && idx(view) < STAGES.length - 1 && <p className="text-xs text-indigo-600">In progress</p>}
                  </li>
                );
              })}
            </ol>
          </div>
        </DetailDialog>
      )}
    </div>
  );
}