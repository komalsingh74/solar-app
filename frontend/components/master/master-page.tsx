"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Chip, StatusBadge, Tone, ViewDialog } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableExportActions from "@/components/layout/TableExportActions";
import api from "@/lib/api";

export const card = "rounded-2xl border border-slate-200 bg-white shadow-none";
export const darkBtn = "h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800";
export const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
const pillTabs = "mb-6 grid h-12 w-full rounded-full border-0 bg-slate-100 p-1";
const pillTab = "rounded-full border-0 text-sm text-slate-600 shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm";
const inputCls = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
const initials = (n: string) => String(n).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export type Row = { id: number | string; [k: string]: string | number };
export type Field = {
  key: string; label: string;
  type?: "text" | "number" | "tel" | "email" | "date" | "select" | "textarea";
  options?: string[]; creatable?: boolean; span?: boolean; placeholder?: string; required?: boolean;
};
export type Column = { key: string; label: string; kind?: "primary" | "chip" | "chips" | "status" | "money" | "text"; sub?: string[] };
export type MasterConfig = {
  title: string; subtitle: string; addLabel: string; entity: string;
  endpoint: string;
  fromApi: (value: Record<string, unknown>) => Row;
  toApi: (row: Row) => Record<string, unknown>;
  stats: { icon: ReactNode; label: string; value: (rows: Row[]) => ReactNode }[];
  columns: Column[];
  groups: { label: string; fields: Field[] }[];
  searchKeys: string[]; searchPlaceholder: string;
  filterKey?: string; filterOptions?: string[]; filterAll?: string;
  tones?: Record<string, Tone>;
};

function FieldBox({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-semibold text-slate-800">{label}</label>
      {children}
    </div>
  );
}

export function MasterPage({ cfg }: { cfg: MasterConfig }) {
  const allFields = cfg.groups.flatMap((g) => g.fields);
  const blank: Row = { id: 0 };
  allFields.forEach((f) => { blank[f.key] = f.type === "number" ? 0 : f.type === "select" ? f.options?.[0] ?? "" : ""; });

  const [list, setList] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Row>(blank);
  const [open, setOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const [requestError, setRequestError] = useState("");
  const [extras, setExtras] = useState<Record<string, string[]>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [newVal, setNewVal] = useState("");

  const tones: Record<string, Tone> = { Active: "green", Inactive: "amber", ...cfg.tones };
  const rows = useMemo(
    () => list.filter((r) =>
      (!cfg.filterKey || filter === "all" || r[cfg.filterKey] === filter) &&
      cfg.searchKeys.map((k) => r[k]).join(" ").toLowerCase().includes(q.toLowerCase())),
    [list, q, filter, cfg.filterKey, cfg.searchKeys],
  );
  useEffect(() => {
    let active = true;
    api.get(cfg.endpoint, { params: { page: 1, limit: 100 } })
      .then(async (response) => {
        const items = response.data?.data?.items;
        if (!Array.isArray(items)) throw new Error("The server returned an invalid master list.");
        const pages = Number(response.data?.data?.pagination?.pages) || 1;
        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
            api.get(cfg.endpoint, { params: { page: index + 2, limit: 100 } })
          )
        );
        const allItems = [
          ...items,
          ...remaining.flatMap((pageResponse) => {
            const pageItems = pageResponse.data?.data?.items;
            if (!Array.isArray(pageItems)) throw new Error("The server returned an invalid master list.");
            return pageItems;
          }),
        ];
        if (active) setList(allItems.map((item: Record<string, unknown>) => cfg.fromApi(item)));
      })
      .catch((error: { userMessage?: string; message?: string }) => {
        if (active) setRequestError(error.userMessage || error.message || `Could not load ${cfg.entity} records.`);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cfg]);

  const openForm = (r: Row) => { setDraft({ ...r }); setAdding(null); setRequestError(""); setOpen(true); };
  const set = (k: string, v: string | number) => setDraft((s) => ({ ...s, [k]: v }));
  const invalid = allFields.some((f) => f.required && !String(draft[f.key] ?? "").trim());
  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setRequestError("");
    try {
      const response = draft.id
        ? await api.patch(`${cfg.endpoint}/${draft.id}`, cfg.toApi(draft))
        : await api.post(cfg.endpoint, cfg.toApi(draft));
      const saved = cfg.fromApi(response.data?.data?.item);
      setList((current) => draft.id
        ? current.map((row) => row.id === draft.id ? saved : row)
        : [saved, ...current]);
      setOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || `Could not save ${cfg.entity}.`);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: Row) => {
    if (!window.confirm(`Delete this ${cfg.entity}? This action cannot be undone.`)) return;
    setDeleting(row.id);
    setRequestError("");
    try {
      await api.delete(`${cfg.endpoint}/${row.id}`);
      setList((current) => current.filter((entry) => entry.id !== row.id));
      if (viewRow?.id === row.id) setViewRow(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || `Could not delete ${cfg.entity}.`);
    } finally {
      setDeleting(null);
    }
  };
  const addOption = (key: string) => {
    const v = newVal.trim();
    if (!v) return;
    setExtras((e) => ({ ...e, [key]: [...(e[key] ?? []), v] }));
    set(key, v); setNewVal(""); setAdding(null);
  };

  const renderField = (f: Field) => {
    const span = f.span || f.type === "textarea" ? "sm:col-span-2" : "";
    if (f.type === "textarea")
      return (
        <FieldBox key={f.key} className={span} label={f.label}>
          <textarea rows={3} className={`${inputCls} h-auto py-3 outline-none`} value={String(draft[f.key])} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
        </FieldBox>
      );
    if (f.type === "select") {
      const opts = [...(f.options ?? []), ...(extras[f.key] ?? [])];
      const cur = String(draft[f.key]);
      if (cur && !opts.includes(cur)) opts.push(cur);
      return (
        <FieldBox key={f.key} className={span} label={f.label}>
          <Select value={cur} onValueChange={(v) => set(f.key, v)}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          {f.creatable && (adding === f.key ? (
            <div className="flex gap-2">
              <Input autoFocus className="h-10 rounded-xl border-slate-200 text-sm" placeholder={`New ${f.label.toLowerCase()}`} value={newVal}
                onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(f.key); } }} />
              <Button type="button" size="sm" className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => addOption(f.key)}>Add</Button>
            </div>
          ) : (
            <button type="button" className="w-fit text-sm font-medium text-indigo-600 hover:underline" onClick={() => { setAdding(f.key); setNewVal(""); }}>+ Add new {f.label.toLowerCase()}</button>
          ))}
        </FieldBox>
      );
    }
    return (
      <FieldBox key={f.key} className={span} label={f.label}>
        <Input className={inputCls} type={f.type ?? "text"} min={f.type === "number" ? 0 : undefined} value={draft[f.key]} placeholder={f.placeholder}
          onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} />
      </FieldBox>
    );
  };

  const cell = (c: Column, r: Row) => {
    const v = r[c.key];
    switch (c.kind) {
      case "primary":
        return (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">{initials(String(v))}</span>
            <div>
              <p className="text-sm font-semibold">{v}</p>
              {c.sub && <p className="text-sm text-muted-foreground">{c.sub.map((k) => r[k]).filter(Boolean).join(" · ")}</p>}
            </div>
          </div>
        );
      case "chip": return <Chip>{v}</Chip>;
      case "chips":
        return <div className="flex flex-wrap gap-1.5">{String(v).split(",").map((s) => s.trim()).filter(Boolean).map((s) => <Chip key={s}>{s}</Chip>)}</div>;
      case "status": return <StatusBadge tone={tones[String(v)] ?? "indigo"}>{v}</StatusBadge>;
      case "money": return <span className="text-sm font-semibold">{inr(Number(v))}</span>;
      default: return <span className="text-sm text-slate-600">{v || "—"}</span>;
    }
  };

  const Form = cfg.groups.length > 1 ? (
    <Tabs defaultValue={cfg.groups[0].label}>
      <TabsList className={pillTabs} style={{ gridTemplateColumns: `repeat(${cfg.groups.length}, minmax(0, 1fr))` }}>
        {cfg.groups.map((g) => <TabsTrigger key={g.label} value={g.label} className={pillTab}>{g.label}</TabsTrigger>)}
      </TabsList>
      {cfg.groups.map((g) => (
        <TabsContent key={g.label} value={g.label} className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">{g.fields.map(renderField)}</TabsContent>
      ))}
    </Tabs>
  ) : (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">{cfg.groups[0].fields.map(renderField)}</div>
  );

  return (
    <div className="space-y-2">
      {requestError && !open && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</p>}
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 px-4 py-3`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cfg.title}</h1>
          <p className="mt-1 text-muted-foreground">{cfg.subtitle}</p>
        </div>
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank)}><Plus /> {cfg.addLabel}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cfg.stats.map((s) => (
          <div key={s.label} className={`${card} flex items-center gap-4 p-4`}>
            <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-indigo-50 text-indigo-600">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold leading-none tracking-tight">{s.value(list)}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={cfg.searchPlaceholder} aria-label="Search" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm" />
          </div>
          {cfg.filterKey && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50 text-sm" aria-label="Filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{cfg.filterAll ?? "All"}</SelectItem>
                {[...new Set([
                  ...(cfg.filterOptions ?? []),
                  ...list.map((row) => row[cfg.filterKey ?? ""]).filter((value): value is string => typeof value === "string" && Boolean(value)),
                ])].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <TableExportActions />
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow className="hover:bg-transparent">
              {cfg.columns.map((c) => <TableHead key={c.key} className="h-14 px-4 text-sm font-medium text-slate-900">{c.label}</TableHead>)}
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                {cfg.columns.map((c) => <TableCell key={c.key} className="px-4 py-3">{cell(c, r)}</TableCell>)}
                <TableCell className="px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`View details for ${r[cfg.columns[0].key]}`} title="View details" className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setViewRow(r)}><Eye /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${r[cfg.columns[0].key]}`} title={`Edit ${cfg.entity}`} className="text-slate-500" onClick={() => openForm(r)}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${r[cfg.columns[0].key]}`} title={`Delete ${cfg.entity}`} className="text-slate-500 hover:bg-rose-50 hover:text-rose-600" disabled={deleting === r.id} onClick={() => void remove(r)}><Trash2 /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={cfg.columns.length + 1} className="py-14 text-center text-muted-foreground">{loading ? `Loading ${cfg.entity} records...` : `No ${cfg.entity} found. Try a different search.`}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 !max-w-2xl">
          <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left">
            <SheetTitle className="text-xl font-bold">{draft.id ? `Edit ${cfg.entity}` : `New ${cfg.entity}`}</SheetTitle>
            <SheetDescription>{draft.id ? "Update the details, then save." : `Fill in the ${cfg.entity} details, then save.`}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-6">{Form}</div>
          <SheetFooter className="flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
            {(invalid || requestError) && <span role={requestError ? "alert" : undefined} className={`text-sm sm:mr-auto ${requestError ? "text-rose-600" : "text-muted-foreground"}`}>{requestError || "Fill the required fields."}</span>}
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-10 flex-1 rounded-xl border-slate-200 px-4 sm:flex-none" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="lg" className={`${darkBtn} flex-1 sm:flex-none disabled:opacity-50`} disabled={invalid || saving} onClick={save}>{saving ? "Saving..." : `Save ${cfg.entity}`}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ViewDialog
        open={Boolean(viewRow)}
        onOpenChange={(next) => { if (!next) setViewRow(null); }}
        title={`${cfg.entity} details`}
        description="Complete record information."
        size="sm:max-w-3xl"
        footer={viewRow && (
          <div className="flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">Record #{viewRow.id}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 rounded-lg border-slate-200 px-3 text-xs" onClick={() => setViewRow(null)}>Close</Button>
              <Button className="h-9 rounded-xl bg-slate-950 px-3.5 text-xs text-white shadow-sm hover:bg-slate-800" onClick={() => { const row = viewRow; setViewRow(null); openForm(row); }}><Pencil size={14} /> Edit {cfg.entity}</Button>
            </div>
          </div>
        )}
      >
        {viewRow && <div className="space-y-4 py-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/70 p-2.5">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
              {initials(String(viewRow[cfg.columns[0].key] ?? cfg.entity))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-slate-900">{String(viewRow[cfg.columns[0].key] ?? cfg.entity)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{cfg.title}{viewRow.status ? ` · ${String(viewRow.status)}` : ""}</p>
            </div>
            {viewRow.status && <StatusBadge tone={tones[String(viewRow.status)] ?? "indigo"}>{String(viewRow.status)}</StatusBadge>}
          </div>
          {cfg.groups.map((g) => <section key={g.label}>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g.label}</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {g.fields.map((f) => <div key={f.key} className="min-w-0 rounded-lg bg-slate-50/70 p-2.5">
                <p className="text-[11px] font-medium text-slate-400">{f.label}</p>
                <p className="mt-1 break-words text-xs font-semibold text-slate-800">{String(viewRow[f.key] ?? "").trim() || "—"}</p>
              </div>)}
            </div>
          </section>)}
        </div>}
      </ViewDialog>
    </div>
  );
}
