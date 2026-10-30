"use client";

import { useEffect, useState } from "react";
import { Plus, Landmark, Banknote, CircleCheck, Clock3, FileCheck, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  Avatar,
  Btn,
  Card,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SearchBox,
  SectionTitle,
  StatCard,
  StatGrid,
  TableFooter,
  TableToolbar,
  inputCls,
  inr,
  type Tone,
} from "@/components/erp/erp-ui";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";

const stages = ["Documents", "Applied", "Inspection", "Net meter", "Commissioned", "Subsidy received"];
const schemes = ["PM Surya Ghar", "PM-KUSUM", "State subsidy", "No subsidy"];
const discoms = ["PVVNL", "MVVNL", "UPPCL", "DVVNL"];
const STUCK_AFTER_DAYS = 15;

type Option = { id: string; name: string };
type ProjectOption = { id: string; customerId: string; name: string; kw: number };
type App = { id: string; customerId: string; projectId: string; customer: string; kw: number; scheme: string; discom: string; appNo: string; stage: number; daysInStage: number; subsidy: number; owner: string; ownerId: string };
const fromApi = (record: Record<string, unknown>): App => {
  const customer = record.customer && typeof record.customer === "object" ? record.customer as Record<string, unknown> : null;
  const project = record.project && typeof record.project === "object" ? record.project as Record<string, unknown> : null;
  const owner = record.owner && typeof record.owner === "object" ? record.owner as Record<string, unknown> : null;
  return {
    id: String(record._id ?? ""), customerId: String(customer?._id ?? record.customer ?? ""),
    projectId: String(project?._id ?? record.project ?? ""), customer: String(customer?.customerName ?? ""),
    kw: Number(record.systemSizeKw ?? 0), scheme: String(record.scheme ?? ""),
    discom: String(record.discom ?? ""), appNo: String(record.portalApplicationNumber ?? ""),
    stage: Math.max(0, stages.indexOf(String(record.currentStage ?? stages[0]))),
    daysInStage: Number(record.daysInStage ?? 0), subsidy: Number(record.expectedSubsidy ?? 0),
    owner: String(owner?.name ?? ""), ownerId: String(owner?._id ?? record.owner ?? ""),
  };
};

/* ---------- page ---------- */

export default function SubsidyPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [owners, setOwners] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [stageFilter, setStageFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<App | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [records, optionsResponse] = await Promise.all([
      getAllPages<Record<string, unknown>>("/subsidy-applications"),
      api.get("/subsidy-applications/options"),
    ]);
    setApps(records.map((record) => fromApi(record)));
    const options = optionsResponse.data?.data;
    setCustomers((options?.customers ?? []).map((customer: Record<string, unknown>) => ({ id: String(customer._id), name: String(customer.customerName) })));
    setProjects((options?.projects ?? []).map((project: Record<string, unknown>) => {
      const customer = project.customer && typeof project.customer === "object" ? project.customer as Record<string, unknown> : null;
      return { id: String(project._id), customerId: String(customer?._id ?? ""), name: String(project.projectCode), kw: Number(project.systemSizeKw ?? 0) };
    }));
    setOwners((options?.owners ?? []).map((owner: Record<string, unknown>) => ({ id: String(owner._id), name: String(owner.name) })));
    setRequestError("");
  };
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load subsidy applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const inProgress = apps.filter((a) => a.stage < 5);
  const pendingAmt = inProgress.reduce((s, a) => s + a.subsidy, 0);
  const receivedAmt = apps.filter((a) => a.stage === 5).reduce((s, a) => s + a.subsidy, 0);
  const stuck = inProgress.filter((a) => a.daysInStage > STUCK_AFTER_DAYS);

  const visible = apps.filter((a) => {
    if (stageFilter !== "all" && a.stage !== stageFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || [a.customer, a.appNo, a.id, a.discom].some((v) => v.toLowerCase().includes(q));
  });

  const advance = async (application: App) => {
    const nextStage = stages[application.stage + 1];
    if (!nextStage) return;
    try {
      const response = await api.patch(`/subsidy-applications/${application.id}`, { currentStage: nextStage });
      const saved = fromApi(response.data?.data?.item);
      setApps((list) => list.map((item) => item.id === saved.id ? saved : item));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update application stage.");
    }
  };
  const save = async (application: { customerId: string; projectId: string; ownerId: string; kw: number; scheme: string; discom: string; appNo: string; subsidy: number }, id?: string) => {
    try {
      const payload = {
        customerId: application.customerId, projectId: application.projectId || null, ownerId: application.ownerId || null,
        systemSizeKw: application.kw, scheme: application.scheme,
        discom: application.discom, portalApplicationNumber: application.appNo,
        expectedSubsidy: application.subsidy, currentStage: id ? stages[editing?.stage ?? 0] : stages[0],
      };
      const response = id
        ? await api.patch(`/subsidy-applications/${id}`, payload)
        : await api.post("/subsidy-applications", payload);
      const saved = fromApi(response.data?.data?.item);
      setApps((list) => id ? list.map((item) => item.id === saved.id ? saved : item) : [saved, ...list]);
      setEditing(null);
      setOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save application.");
    }
  };
  const remove = async (application: App) => {
    if (!window.confirm(`Delete application ${application.appNo || application.id}?`)) return;
    try {
      await api.delete(`/subsidy-applications/${application.id}`);
      setApps((list) => list.filter((item) => item.id !== application.id));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete application.");
    }
  };

  return (
    <div className="min-w-0 !space-y-2">
      <PageHeader
        eyebrow="Project operations"
        title="Subsidy & Net Metering"
        desc="Follow every application from documents to subsidy received, and see which ones are stuck."
        actions={
          <Btn variant="primary" icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
            New application
          </Btn>
        }
      />

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Card className="p-5 text-sm text-slate-500">Loading applications…</Card>}
      <StatGrid>
        <StatCard dark label="Applications in progress" value={String(inProgress.length)} sub={`${apps.length} total tracked`} icon={Landmark} />
        <StatCard label="Subsidy pending" value={inr(pendingAmt)} sub="Expected from portal / DISCOM" icon={Banknote} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Subsidy received" value={inr(receivedAmt)} sub="Credited to customers" icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label={`Stuck over ${STUCK_AFTER_DAYS} days`} value={String(stuck.length)} sub="Follow up with DISCOM / portal" icon={Clock3} tint="bg-red-50 text-red-600" />
      </StatGrid>

      {/* Stage tiles (click to filter) */}
      <Card className="p-4">
        <SectionTitle
          title="Application stages"
          sub="Click a stage to filter the list"
          action={
            stageFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStageFilter("all")}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Clear filter
              </button>
            )
          }
        />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stages.map((s, i) => {
            const count = apps.filter((a) => a.stage === i).length;
            const active = stageFilter === i;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(active ? "all" : i)}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active ? "border-indigo-200 bg-indigo-50/70 ring-1 ring-indigo-100" : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                }`}
              >
                <p className={`text-2xl font-bold tabular-nums ${active ? "text-indigo-700" : "text-slate-900"}`}>{count}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <TableToolbar>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Applications</h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search customer, application no..." />
        </TableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 sm:px-6">Customer</th>
                <th className="px-3 py-3">Scheme / DISCOM</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3">Current stage</th>
                <th className="px-3 py-3 text-right">Subsidy</th>
                <th className="px-5 py-3 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((a) => {
                const done = a.stage === 5;
                const isStuck = !done && a.daysInStage > STUCK_AFTER_DAYS;
                return (
                  <tr key={a.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.customer} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{a.customer}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {a.kw} kW · {a.appNo || "Not applied yet"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-slate-700">{a.scheme}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{a.discom}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex w-36 gap-1" title={`${stages[a.stage]} (${a.stage + 1} of ${stages.length})`}>
                        {stages.map((s, i) => (
                          <span
                            key={s}
                            className={`h-1.5 flex-1 rounded-full ${
                              i < a.stage ? "bg-indigo-300" : i === a.stage ? (done ? "bg-emerald-500" : "bg-indigo-600") : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={done ? "emerald" : "indigo"}>{stages[a.stage]}</Chip>
                        {isStuck && <Chip tone="red">{a.daysInStage} days</Chip>}
                        {!done && !isStuck && <span className="text-xs text-slate-400">{a.daysInStage} days</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900">
                      {a.subsidy ? inr(a.subsidy) : "-"}
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <FileCheck size={14} /> Completed
                        </span>
                      ) : (
                        <Btn size="sm" onClick={() => void advance(a)}>
                          Move to {stages[a.stage + 1]} <ChevronRight size={13} />
                        </Btn>
                      )}
                      <button type="button" className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label={`Edit ${a.appNo || a.id}`} onClick={() => { setEditing(a); setOpen(true); }}><Pencil size={15} /></button>
                      <button type="button" className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Delete application" onClick={() => void remove(a)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <EmptyState icon={Landmark} title="No applications found" text="Change the stage filter or add a new application." />
          )}
        </div>
        <TableFooter shown={visible.length} total={apps.length} />
      </Card>

      {open && (
        <NewApplication
          customers={customers}
          projects={projects}
          owners={owners}
          initial={editing ?? undefined}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </div>
  );
}

/* ---------- dialog ---------- */

function NewApplication({ customers, projects, owners, initial, onClose, onSave }: { customers: Option[]; projects: ProjectOption[]; owners: Option[]; initial?: App; onClose: () => void; onSave: (a: { customerId: string; projectId: string; ownerId: string; kw: number; scheme: string; discom: string; appNo: string; subsidy: number }, id?: string) => void }) {
  const [f, setF] = useState({
    customer: initial?.customerId ?? "", project: initial?.projectId ?? "", owner: initial?.ownerId ?? "",
    kw: initial ? String(initial.kw) : "", scheme: initial?.scheme ?? schemes[0],
    discom: initial?.discom ?? discoms[0], appNo: initial?.appNo ?? "", subsidy: initial ? String(initial.subsidy) : "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Modal
      title={initial ? "Edit application" : "New application"}
      desc={initial ? "Update the customer, project, and application details." : "Start tracking a subsidy or net metering file."}
      submitLabel={initial ? "Update application" : "Save application"}
      disabled={!f.customer.trim() || !(Number(f.kw) > 0)}
      onClose={onClose}
      onSubmit={() =>
        onSave({
          customerId: f.customer, projectId: f.project, ownerId: f.owner, kw: Number(f.kw), scheme: f.scheme,
          discom: f.discom, appNo: f.appNo.trim(), subsidy: Number(f.subsidy) || 0,
        }, initial?.id)
      }
    >
      <Field label="Customer" wide>
        <select className={inputCls} value={f.customer} onChange={(e) => setF((current) => ({ ...current, customer: e.target.value, project: "" }))} autoFocus>
          <option value="">Select a customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="Solar project (optional)" wide>
        <select className={inputCls} value={f.project} onChange={(e) => {
          const projectId = e.target.value;
          const project = projects.find((entry) => entry.id === projectId);
          setF((current) => ({ ...current, project: projectId, ...(project ? { customer: project.customerId, kw: String(project.kw) } : {}) }));
        }}>
          <option value="">No linked project</option>
          {projects.filter((project) => project.customerId === f.customer).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </Field>
      <Field label="System size (kW)">
        <input type="number" min="0" step="0.5" className={inputCls} value={f.kw} onChange={(e) => set("kw", e.target.value)} />
      </Field>
      <Field label="Expected subsidy (₹)">
        <input type="number" min="0" className={inputCls} value={f.subsidy} onChange={(e) => set("subsidy", e.target.value)} />
      </Field>
      <Field label="Scheme">
        <select className={inputCls} value={f.scheme} onChange={(e) => set("scheme", e.target.value)}>
          {schemes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="DISCOM">
        <select className={inputCls} value={f.discom} onChange={(e) => set("discom", e.target.value)}>
          {discoms.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Application owner">
        <select className={inputCls} value={f.owner} onChange={(e) => set("owner", e.target.value)}>
          <option value="">Unassigned</option>
          {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
        </select>
      </Field>
      <Field label="Portal application no. (optional)" wide>
        <input className={inputCls} value={f.appNo} onChange={(e) => set("appNo", e.target.value)} />
      </Field>
    </Modal>
  );
}
