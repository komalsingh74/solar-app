"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";
import { Plus, ShieldCheck, RefreshCw, Banknote, CalendarClock, Wrench, Pencil, Trash2 } from "lucide-react";
import {
  Avatar,
  Btn,
  Card,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Progress,
  SearchBox,
  StatCard,
  StatGrid,
  TableFooter,
  TableToolbar,
  Tabs,
  TODAY,
  addYears,
  daysBetween,
  fmtDate,
  inputCls,
  inr,
  type Tone,
} from "@/components/erp/erp-ui";

/* ---------- AMC plan presets ---------- */

const plans = [
  { name: "Basic", visits: 2, note: "2 visits a year" },
  { name: "Standard", visits: 4, note: "4 visits a year" },
  { name: "Premium", visits: 12, note: "Monthly cleaning + inspection" },
];

type Amc = {
  id: string;
  dbId: string;
  projectId: string;
  customer: string;
  kw: number;
  plan: string;
  start: string;
  end: string;
  done: number;
  total: number;
  next: string;
  fee: number;
};

type Warranty = {
  id: string;
  dbId: string;
  customerId: string;
  projectId: string;
  customer: string;
  item: string;
  brand: string;
  serial: string;
  installed: string;
  years: number;
};

type Option = { id: string; name: string; kw?: number; customerId?: string };
type ApiRecord = Record<string, unknown>;
const asRecord = (value: unknown): ApiRecord => value && typeof value === "object" ? value as ApiRecord : {};
const fromAmc = (record: ApiRecord): Amc => {
  const project = asRecord(record.project);
  const customer = asRecord(record.customer);
  const visits = Array.isArray(record.visits) ? record.visits : [];
  return {
    id: String(record.contractNumber ?? ""), dbId: String(record._id ?? ""), projectId: String(project._id ?? record.project ?? ""),
    customer: String(customer.customerName ?? ""), kw: Number(project.systemSizeKw ?? 0),
    plan: String(record.plan ?? ""), start: String(record.startDate ?? "").slice(0, 10),
    end: String(record.endDate ?? "").slice(0, 10), done: visits.length,
    total: Number(record.annualVisitAllowance ?? 0), next: "-", fee: Number(record.annualFee ?? 0),
  };
};
const fromWarranty = (record: ApiRecord): Warranty => {
  const customer = asRecord(record.customer);
  const project = asRecord(record.project);
  return {
    id: String(record.warrantyNumber ?? ""), dbId: String(record._id ?? ""), customerId: String(customer._id ?? record.customer ?? ""),
    projectId: String(project._id ?? record.project ?? ""), customer: String(customer.customerName ?? ""),
    item: String(record.itemName ?? ""), brand: String(record.brand ?? ""), serial: String(record.serialNumber ?? ""),
    installed: String(record.installedAt ?? "").slice(0, 10), years: Number(record.durationYears ?? 0),
  };
};

/* ---------- derived status ---------- */

function amcStatus(a: Amc): { label: string; tone: Tone } {
  const left = daysBetween(TODAY, a.end);
  if (left < 0) return { label: "Expired", tone: "red" };
  if (left <= 30) return { label: `Renew in ${left} days`, tone: "amber" };
  return { label: "Active", tone: "emerald" };
}

function warrantyStatus(w: Warranty) {
  const till = addYears(w.installed, w.years);
  const left = daysBetween(TODAY, till);
  const totalDays = daysBetween(w.installed, till);
  const used = Math.min(100, Math.max(0, ((totalDays - left) / totalDays) * 100));
  if (left < 0) return { till, left, used, label: "Expired", tone: "red" as Tone, bar: "red" as const };
  if (left <= 90) return { till, left, used, label: `${left} days left`, tone: "amber" as Tone, bar: "amber" as const };
  return { till, left, used, label: "In warranty", tone: "emerald" as Tone, bar: "indigo" as const };
}

/* ---------- page ---------- */

export default function AmcPage() {
  const [tab, setTab] = useState<"amc" | "warranty">("amc");
  const [amcs, setAmcs] = useState<Amc[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingAmc, setEditingAmc] = useState<Amc | null>(null);
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const load = useCallback(async () => {
    const [contractRecords, warrantyRecords, amcOptions, warrantyOptions] = await Promise.all([
      getAllPages<ApiRecord>("/amcs"),
      getAllPages<ApiRecord>("/warranties"),
      api.get("/amcs/options"),
      api.get("/warranties/options"),
    ]);
    setAmcs(contractRecords.map(fromAmc));
    setWarranties(warrantyRecords.map(fromWarranty));
    const projectRecords = Array.isArray(amcOptions.data?.data?.projects) ? amcOptions.data.data.projects : [];
    setProjects(projectRecords.map((record: ApiRecord) => {
      const customer = asRecord(record.customer);
      return { id: String(record._id), name: `${String(record.projectCode)} · ${Number(record.systemSizeKw ?? 0)} kW`, kw: Number(record.systemSizeKw ?? 0), customerId: String(customer._id ?? "") };
    }));
    const customerRecords = Array.isArray(warrantyOptions.data?.data?.customers) ? warrantyOptions.data.data.customers : [];
    setCustomers(customerRecords.map((record: ApiRecord) => ({ id: String(record._id), name: String(record.customerName) })));
    setRequestError("");
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load AMC and warranty records."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const active = amcs.filter((a) => daysBetween(TODAY, a.end) >= 0);
  const renewals = amcs.filter((a) => daysBetween(TODAY, a.end) <= 30);
  const revenue = active.reduce((s, a) => s + a.fee, 0);
  const expiringWarranty = warranties.filter((w) => {
    const left = daysBetween(TODAY, addYears(w.installed, w.years));
    return left >= 0 && left <= 90;
  });

  const q = query.trim().toLowerCase();
  const amcRows = amcs.filter((a) => !q || [a.id, a.customer, a.plan].some((v) => v.toLowerCase().includes(q)));
  const warrantyRows = warranties.filter((w) => !q || [w.customer, w.item, w.brand, w.serial].some((v) => v.toLowerCase().includes(q)));

  const logVisit = async (id: string) => {
    const contract = amcs.find((item) => item.id === id);
    if (!contract) return;
    try {
      await api.post(`/amcs/${contract.dbId}/visits`, {});
      await load();
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not log AMC visit.");
    }
  };
  const renew = async (id: string) => {
    const contract = amcs.find((item) => item.id === id);
    if (!contract) return;
    try {
      await api.post(`/amcs/${contract.dbId}/renew`, {});
      await load();
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not renew AMC contract.");
    }
  };
  const removeWarranty = async (warranty: Warranty) => {
    if (!window.confirm(`Delete warranty record ${warranty.id}?`)) return;
    try {
      await api.delete(`/warranties/${warranty.dbId}`);
      setWarranties((list) => list.filter((item) => item.dbId !== warranty.dbId));
      setRequestError("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete warranty record.");
    }
  };
  const removeAmc = async (contract: Amc) => {
    if (!window.confirm(`Delete AMC contract ${contract.id}?`)) return;
    try {
      await api.delete(`/amcs/${contract.dbId}`);
      setAmcs((list) => list.filter((item) => item.dbId !== contract.dbId));
      setRequestError("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete AMC contract.");
    }
  };

  return (
    <div className="min-w-0 !space-y-2">
      <PageHeader
        eyebrow="Service & support"
        title="AMC & Warranty"
        desc="Keep every maintenance contract and equipment warranty in one place, and never miss a renewal."
        actions={tab === "amc"
          ? <Btn variant="primary" icon={Plus} onClick={() => { setEditingAmc(null); setOpen(true); }}>New AMC contract</Btn>
          : <Btn variant="primary" icon={Plus} onClick={() => { setEditingWarranty(null); setWarrantyOpen(true); }}>Register warranty</Btn>}
      />
      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Card className="p-4 text-sm text-slate-500">Loading service records...</Card>}

      <StatGrid>
        <StatCard dark label="Active AMC contracts" value={String(active.length)} sub={`${amcs.length} contracts in total`} icon={ShieldCheck} />
        <StatCard label="Renewals due" value={String(renewals.length)} sub="Expired or ending in 30 days" icon={RefreshCw} tint="bg-amber-50 text-amber-600" />
        <StatCard label="AMC revenue" value={inr(revenue)} sub="From active contracts, per year" icon={Banknote} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="Warranty ending soon" value={String(expiringWarranty.length)} sub="Within the next 90 days" icon={CalendarClock} tint="bg-indigo-50 text-indigo-600" />
      </StatGrid>

      <Card>
        <TableToolbar>
          <Tabs
            items={[
              { key: "amc" as const, label: "AMC contracts", count: amcs.length },
              { key: "warranty" as const, label: "Warranty tracker", count: warranties.length },
            ]}
            value={tab}
            onChange={setTab}
          />
          <SearchBox value={query} onChange={setQuery} placeholder={tab === "amc" ? "Search customer, plan..." : "Search customer, brand, serial no..."} />
        </TableToolbar>

        {tab === "amc" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 sm:px-6">Customer</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Visits</th>
                    <th className="px-3 py-3">Valid till</th>
                    <th className="px-3 py-3 text-right">Fee / year</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3 text-right sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {amcRows.map((a) => {
                    const st = amcStatus(a);
                    const needsRenewal = st.tone !== "emerald";
                    return (
                      <tr key={a.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={a.customer} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{a.customer}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {a.id} · {a.kw} kW
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-700">{a.plan}</td>
                        <td className="px-3 py-4">
                          <div className="w-28">
                            <p className="mb-1 text-xs tabular-nums text-slate-500">
                              {a.done} of {a.total} done
                            </p>
                            <Progress value={(a.done / a.total) * 100} tone={a.done === a.total ? "emerald" : "indigo"} />
                          </div>
                          {a.next !== "-" && a.done < a.total && (
                            <p className="mt-1 text-xs text-slate-400">Next: {fmtDate(a.next)}</p>
                          )}
                        </td>
                        <td className="px-3 py-4 text-slate-700">{fmtDate(a.end)}</td>
                        <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900">{inr(a.fee)}</td>
                        <td className="px-3 py-4">
                          <Chip tone={st.tone}>{st.label}</Chip>
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <div className="flex items-center justify-end gap-1">
                            {needsRenewal ? (
                              <Btn size="sm" variant="primary" icon={RefreshCw} onClick={() => void renew(a.id)}>Renew</Btn>
                            ) : (
                              <Btn size="sm" icon={Wrench} disabled={a.done >= a.total} onClick={() => void logVisit(a.id)}>Log visit</Btn>
                            )}
                            <button type="button" aria-label={`Edit ${a.id}`} onClick={() => { setEditingAmc(a); setOpen(true); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={14} /></button>
                            <button type="button" aria-label={`Delete ${a.id}`} onClick={() => void removeAmc(a)} className="rounded-lg border border-slate-200 p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {amcRows.length === 0 && <EmptyState icon={ShieldCheck} title="No contracts found" text="Try a different search or add a new AMC contract." />}
            </div>
            <TableFooter shown={amcRows.length} total={amcs.length} />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 sm:px-6">Equipment</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Serial no.</th>
                    <th className="px-3 py-3">Warranty used</th>
                    <th className="px-3 py-3">Valid till</th>
                    <th className="px-5 py-3 sm:px-6">Status</th>
                    <th className="px-5 py-3 text-right sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warrantyRows.map((w) => {
                    const s = warrantyStatus(w);
                    return (
                      <tr key={w.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4 sm:px-6">
                          <p className="font-semibold text-slate-900">{w.item}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {w.brand} · {w.years} years
                          </p>
                        </td>
                        <td className="px-3 py-4 text-slate-700">{w.customer}</td>
                        <td className="px-3 py-4 tabular-nums text-slate-600">{w.serial}</td>
                        <td className="px-3 py-4">
                          <div className="w-32">
                            <Progress value={s.used} tone={s.bar} />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-700">{fmtDate(s.till)}</td>
                        <td className="px-5 py-4 sm:px-6">
                          <Chip tone={s.tone}>{s.label}</Chip>
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <button type="button" aria-label={`Edit ${w.id}`} onClick={() => { setEditingWarranty(w); setWarrantyOpen(true); }} className="mr-1 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={14} /></button>
                          <button type="button" aria-label={`Delete ${w.id}`} onClick={() => void removeWarranty(w)} className="rounded-lg border border-slate-200 p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {warrantyRows.length === 0 && <EmptyState icon={ShieldCheck} title="No equipment found" text="Try a different search." />}
            </div>
            <TableFooter shown={warrantyRows.length} total={warranties.length} />
          </>
        )}
      </Card>

      {open && (
        <NewAmc
          projects={projects}
          contract={editingAmc ?? undefined}
          onClose={() => setOpen(false)}
          onSave={async (payload) => {
            const response = editingAmc
              ? await api.patch(`/amcs/${editingAmc.dbId}`, payload)
              : await api.post("/amcs", payload);
            const saved = fromAmc(response.data?.data?.item);
            setAmcs((list) => editingAmc
              ? list.map((item) => item.dbId === editingAmc.dbId ? saved : item)
              : [saved, ...list]);
            setOpen(false);
            setEditingAmc(null);
            setRequestError("");
          }}
        />
      )}
      {warrantyOpen && <WarrantyForm
        customers={customers}
        projects={projects}
        warranty={editingWarranty ?? undefined}
        onClose={() => { setWarrantyOpen(false); setEditingWarranty(null); }}
        onSave={async (payload) => {
          const response = editingWarranty
            ? await api.patch(`/warranties/${editingWarranty.dbId}`, payload)
            : await api.post("/warranties", payload);
          const saved = fromWarranty(response.data?.data?.item);
          setWarranties((list) => editingWarranty
            ? list.map((item) => item.dbId === editingWarranty.dbId ? saved : item)
            : [saved, ...list]);
          setWarrantyOpen(false);
          setEditingWarranty(null);
        }}
      />}
    </div>
  );
}

/* ---------- dialog ---------- */

function NewAmc({ projects, contract, onClose, onSave }: {
  projects: Option[];
  contract?: Amc;
  onClose: () => void;
  onSave: (payload: { projectId: string; plan: string; annualVisitAllowance: number; startDate: string; endDate: string; annualFee: number }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    projectId: contract?.projectId ?? "",
    plan: contract?.plan ?? plans[1].name,
    visits: String(contract?.total ?? plans[1].visits),
    start: contract?.start ?? TODAY,
    end: contract?.end ?? addYears(TODAY, 1),
    fee: String(contract?.fee ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const valid = Boolean(form.projectId && form.plan.trim() && Number.isInteger(Number(form.visits)) && Number(form.visits) > 0
    && form.start && form.end >= form.start && Number(form.fee) >= 0);
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        projectId: form.projectId, plan: form.plan,
        annualVisitAllowance: Number(form.visits), startDate: form.start,
        endDate: form.end, annualFee: Number(form.fee),
      });
    } catch (reason) {
      const err = reason as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || "Could not save AMC contract.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={contract ? `Edit ${contract.id}` : "New AMC contract"}
      desc="Select a project and define the contract dates, fee, and annual visit allowance."
      submitLabel={saving ? "Saving..." : contract ? "Save changes" : "Save contract"}
      disabled={!valid || saving}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {error && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Project" wide>
        <select className={inputCls} value={form.projectId} onChange={(event) => set("projectId", event.target.value)}>
          <option value="">Select a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </Field>
      {selectedProject && <p className="-mt-2 text-sm text-slate-500 sm:col-span-2">System size: {selectedProject.kw} kW</p>}
      <Field label="Plan">
        <select className={inputCls} value={form.plan} onChange={(event) => {
          const selected = plans.find((item) => item.name === event.target.value);
          setForm((current) => ({ ...current, plan: event.target.value, visits: String(selected?.visits ?? current.visits) }));
        }}>
          {plans.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.note})</option>)}
        </select>
      </Field>
      <Field label="Visits per year">
        <input type="number" min="1" max="365" className={inputCls} value={form.visits} onChange={(event) => set("visits", event.target.value)} />
      </Field>
      <Field label="Start date">
        <input type="date" className={inputCls} value={form.start} onChange={(event) => {
          const value = event.target.value;
          setForm((current) => ({ ...current, start: value, ...(contract ? {} : { end: addYears(value, 1) }) }));
        }} />
      </Field>
      <Field label="End date">
        <input type="date" className={inputCls} value={form.end} onChange={(event) => set("end", event.target.value)} />
      </Field>
      <Field label="Fee per year (₹)" wide>
        <input type="number" min="0" className={inputCls} value={form.fee} onChange={(event) => set("fee", event.target.value)} />
      </Field>
    </Modal>
  );
}

function WarrantyForm({ customers, projects, warranty, onClose, onSave }: {
  customers: Option[];
  projects: Option[];
  warranty?: Warranty;
  onClose: () => void;
  onSave: (payload: { customerId: string; projectId: string | null; itemName: string; brand: string; serialNumber: string; installedAt: string; durationYears: number }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    customerId: warranty?.customerId ?? "", projectId: warranty?.projectId ?? "",
    item: warranty?.item ?? "", brand: warranty?.brand ?? "", serial: warranty?.serial ?? "",
    installed: warranty?.installed ?? TODAY, years: String(warranty?.years ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({
    ...current, [key]: value, ...(key === "customerId" ? { projectId: "" } : {}),
  }));
  const valid = Boolean(form.customerId && form.item.trim() && form.brand.trim() && form.serial.trim()
    && form.installed && Number(form.years) > 0);
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        customerId: form.customerId, projectId: form.projectId || null,
        itemName: form.item.trim(), brand: form.brand.trim(), serialNumber: form.serial.trim(),
        installedAt: form.installed, durationYears: Number(form.years),
      });
    } catch (reason) {
      const err = reason as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || "Could not save warranty.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={warranty ? `Edit ${warranty.id}` : "Register equipment warranty"}
      desc="Record equipment serial, installation date, and warranty duration."
      submitLabel={saving ? "Saving..." : warranty ? "Save changes" : "Register warranty"}
      disabled={!valid || saving}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {error && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Customer">
        <select className={inputCls} value={form.customerId} onChange={(event) => set("customerId", event.target.value)}>
          <option value="">Select a customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="Project (optional)">
        <select className={inputCls} value={form.projectId} onChange={(event) => set("projectId", event.target.value)}>
          <option value="">No linked project</option>
          {projects.filter((project) => project.customerId === form.customerId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </Field>
      <Field label="Equipment">
        <input className={inputCls} value={form.item} onChange={(event) => set("item", event.target.value)} placeholder="e.g. Solar panel" />
      </Field>
      <Field label="Brand / model">
        <input className={inputCls} value={form.brand} onChange={(event) => set("brand", event.target.value)} />
      </Field>
      <Field label="Serial number">
        <input className={inputCls} value={form.serial} onChange={(event) => set("serial", event.target.value)} />
      </Field>
      <Field label="Warranty duration (years)">
        <input type="number" min="1" max="100" step="1" className={inputCls} value={form.years} onChange={(event) => set("years", event.target.value)} />
      </Field>
      <Field label="Installation date" wide>
        <input type="date" className={inputCls} value={form.installed} onChange={(event) => set("installed", event.target.value)} />
      </Field>
    </Modal>
  );
}
