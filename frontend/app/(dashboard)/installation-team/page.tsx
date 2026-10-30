"use client";

import { Avatar, Chip, PageHeader, Panel, StatCard, StatusBadge, Tone, TextField } from "@/components/ui/page-layout";
import { SideSheet, darkBtn, inr } from "@/components/master/module-kit";
import { useEffect, useState } from "react";
import { HardHat, Pencil, Plus, Trash2, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

const STATUS = ["Available", "On site", "On leave"];
const statusTone: Record<string, Tone> = { Available: "green", "On site": "indigo", "On leave": "amber" };
type Person = { id: string; name: string; phone: string; role: string };
type Project = { id: string; name: string };
type Team = { id: string; name: string; lead: string; members: string[]; vehicle: string; skills: string; status: string; projectId: string; project: string; kwMonth: number; rate: number };
const blank = (): Team => ({ id: "", name: "", lead: "", members: [], vehicle: "", skills: "", status: "Available", projectId: "", project: "", kwMonth: 0, rate: 400 });

const fromApi = (record: Record<string, unknown>): Team => {
  const lead = record.lead && typeof record.lead === "object" ? record.lead as Record<string, unknown> : null;
  const project = record.project && typeof record.project === "object" ? record.project as Record<string, unknown> : null;
  const members = Array.isArray(record.members) ? record.members as Record<string, unknown>[] : [];
  return {
    ...blank(), id: String(record._id ?? ""), name: String(record.teamName ?? ""),
    lead: String(lead?._id ?? record.lead ?? ""), members: members.map((member) => String(member?._id ?? member)),
    vehicle: String(record.vehicle ?? ""), skills: String(record.skills ?? ""), status: String(record.status ?? "Available"),
    projectId: String(project?._id ?? record.project ?? ""), project: String(project?.projectCode ?? ""),
    kwMonth: Number(record.monthlyInstalledKw ?? 0), rate: Number(record.incentiveRatePerKw ?? 400),
  };
};

export default function InstallationTeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Team>(blank());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState("");

  const load = async () => {
    const [teamResponse, optionsResponse] = await Promise.all([api.get("/installation-teams"), api.get("/installation-teams/options")]);
    const items = teamResponse.data?.data?.items;
    if (!Array.isArray(items)) throw new Error("The server returned an invalid installation-team list.");
    setTeams(items.map((item: Record<string, unknown>) => fromApi(item)));
    const options = optionsResponse.data?.data;
    setEmployees((options?.employees ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.name), phone: String(item.phone ?? ""), role: String(item.role ?? "Employee") })));
    setProjects((options?.projects ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.projectCode) })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load installation teams."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const employee = (id: string) => employees.find((entry) => entry.id === id);
  const set = (key: keyof Team) => (value: string) => setDraft((current) => ({ ...current, [key]: ["kwMonth", "rate"].includes(key) ? Number(value) : value }));
  const toggle = (id: string) => setDraft((current) => ({
    ...current,
    members: current.members.includes(id) ? current.members.filter((member) => member !== id) : [...current.members, id],
  }));
  const otherTeam = (id: string) => teams.find((team) => team.id !== draft.id && team.members.includes(id));
  const error = !draft.name.trim() ? "Team name is required."
    : draft.members.length === 0 ? "Select at least one active user."
      : !draft.members.includes(draft.lead) ? "Choose a team lead from the selected members."
        : draft.status === "On site" && !draft.projectId ? "Assign a project to an on-site team."
          : "";

  const save = async () => {
    if (error) return;
    setSaving(true);
    setRequestError("");
    try {
      const payload = {
        teamName: draft.name, leadId: draft.lead, memberIds: draft.members,
        vehicle: draft.vehicle, skills: draft.skills, status: draft.status,
        projectId: draft.projectId || null, monthlyInstalledKw: Number(draft.kwMonth),
        incentiveRatePerKw: Number(draft.rate),
      };
      const response = draft.id ? await api.patch(`/installation-teams/${draft.id}`, payload) : await api.post("/installation-teams", payload);
      const saved = fromApi(response.data?.data?.item);
      setTeams((current) => draft.id ? current.map((team) => team.id === saved.id ? saved : team) : [...current, saved]);
      setOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save installation team.");
    } finally { setSaving(false); }
  };

  const remove = async (team: Team) => {
    if (!window.confirm(`Delete ${team.name}?`)) return;
    try {
      await api.delete(`/installation-teams/${team.id}`);
      setTeams((current) => current.filter((entry) => entry.id !== team.id));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete installation team.");
    }
  };

  const openNew = () => { setDraft(blank()); setOpen(true); };

  return (
    <div className="!space-y-2">
      <PageHeader title="Installation team" subtitle="Manage crew membership, project assignments, capacity and installation incentives.">
        <Button size="lg" className={darkBtn} onClick={openNew}><Plus /> Add crew</Button>
      </PageHeader>
      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-5 text-sm text-muted-foreground">Loading installation teams…</Panel>}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<HardHat size={24} />} value={teams.filter((team) => team.status === "On site").length} label="Crews on site" />
        <StatCard icon={<Truck size={24} />} value={teams.filter((team) => team.status === "Available").length} label="Crews available" />
        <StatCard icon={<Zap size={24} />} value={`${teams.reduce((total, team) => total + team.kwMonth, 0)} kW`} label="Installed this month" />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {teams.map((team) => {
          const pool = team.kwMonth * team.rate;
          return (
            <Panel key={team.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-lg font-bold">{team.name}</h2><StatusBadge tone={statusTone[team.status] ?? "slate"}>{team.status}</StatusBadge></div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{team.project || "No project assigned"}</p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${team.name}`} onClick={() => { setDraft({ ...team }); setOpen(true); }}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${team.name}`} onClick={() => void remove(team)}><Trash2 /></Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{team.skills.split(",").map((skill) => skill.trim()).filter(Boolean).map((skill) => <Chip key={skill}>{skill}</Chip>)}{team.vehicle && <Chip>{team.vehicle}</Chip>}</div>
              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <div><p className="text-muted-foreground">Installed this month</p><p className="flex items-center gap-1 text-lg font-bold"><Zap size={15} />{team.kwMonth} kW</p></div>
                <div><p className="text-muted-foreground">Incentive pool</p><p className="text-lg font-bold">{inr(pool)}</p></div>
                <div><p className="text-muted-foreground">Per member</p><p className="text-lg font-bold">{inr(team.members.length ? pool / team.members.length : 0)}</p></div>
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {team.members.map((id) => {
                  const person = employee(id);
                  if (!person) return null;
                  return <li key={id} className="flex items-center gap-3 py-2.5"><Avatar name={person.name} /><div><p className="font-semibold">{person.name}{id === team.lead && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Lead</span>}</p><p className="text-sm text-muted-foreground">{person.role} · {person.phone}</p></div></li>;
                })}
              </ul>
            </Panel>
          );
        })}
        {!loading && teams.length === 0 && <Panel className="py-14 text-center text-muted-foreground lg:col-span-2">No installation teams yet. Add a crew to start assigning projects.</Panel>}
      </div>
      <p className="text-sm text-muted-foreground">Incentive pool = installed kW × rate per kW; the displayed member share is an equal estimate.</p>

      <SideSheet open={open} onOpenChange={setOpen} title={draft.id ? "Update crew" : "New crew"} description="Choose active users, the crew lead, and a project assignment." error={error} saveLabel={saving ? "Saving…" : "Save crew"} onSave={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Crew name" value={draft.name} onChange={set("name")} placeholder="Team C" />
          <div className="grid gap-2"><label className="text-sm font-semibold">Status</label><Select value={draft.status} onValueChange={(value) => set("status")(value ?? "")}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 sm:col-span-2"><label className="text-sm font-semibold">Current project</label><Select value={draft.projectId} onValueChange={(value) => { const projectId = value ?? ""; setDraft((current) => ({ ...current, projectId, project: projects.find((project) => project.id === projectId)?.name ?? "" })); }}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="No project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
          <TextField label="Vehicle" value={draft.vehicle} onChange={set("vehicle")} />
          <TextField label="Skills (comma separated)" value={draft.skills} onChange={set("skills")} placeholder="RCC rooftop, Net-metering" />
          <TextField label="kW installed this month" type="number" min={0} value={String(draft.kwMonth)} onChange={set("kwMonth")} />
          <TextField label="Incentive rate (₹ per kW)" type="number" min={0} value={String(draft.rate)} onChange={set("rate")} />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold">Members</p>
            <ul className="space-y-2">
              {employees.map((person) => {
                const other = otherTeam(person.id);
                const checked = draft.members.includes(person.id);
                return <li key={person.id}><label className={`flex items-center gap-2 text-sm ${other ? "text-slate-400" : "cursor-pointer"}`}><input type="checkbox" disabled={!!other} checked={checked} onChange={() => toggle(person.id)} className="h-4 w-4 accent-indigo-600" />{person.name} · {person.role}{other && ` (assigned to ${other.name})`}</label></li>;
              })}
            </ul>
          </div>
          <div className="grid gap-2 sm:col-span-2"><label className="text-sm font-semibold">Team lead</label><Select value={draft.lead} onValueChange={(lead) => set("lead")(lead ?? "")}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select team lead" /></SelectTrigger><SelectContent>{draft.members.map((id) => { const person = employee(id); return person ? <SelectItem key={id} value={id}>{person.name}</SelectItem> : null; })}</SelectContent></Select></div>
        </div>
      </SideSheet>
    </div>
  );
}
