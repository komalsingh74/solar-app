"use client";

import { Avatar, Chip, PageHeader, Panel, StatCard, StatusBadge, Tone, SelectField, TextField } from "@/components/ui/page-layout";
import { SideSheet, d, darkBtn, fmtDate, pillList, pillTrig, thCls } from "@/components/master/module-kit";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ArrowRightLeft, Boxes, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";

const TYPES = ["Received", "Issued", "Transfer", "Returned"];
const STOCK_FILTERS = ["In stock", "Low stock", "Out of stock"];
const typeTone: Record<string, Tone> = { Received: "green", Issued: "indigo", Transfer: "amber", Returned: "slate" };
const stockTone: Record<string, Tone> = { "In stock": "green", "Low stock": "amber", "Out of stock": "red" };
const needFrom = (t: string) => t !== "Received";
const needTo = (_t: string) => true;

type WarehouseOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };
type Item = { id: string; name: string; sku: string; category: string; unit: string; min: number; qty: Record<string, number> };
type Move = { id: string; date: string; type: string; item: string; qty: number; from: string; to: string; ref: string; by: string };
type Draft = { type: string; item: string; qty: string; from: string; to: string; projectId: string; ref: string; date: string };
const blank = (type = "Received", items: Item[] = [], warehouses: WarehouseOption[] = []): Draft => ({
  type, item: items[0]?.id ?? "", qty: "", from: warehouses[0]?.id ?? "",
  to: warehouses.find((warehouse) => warehouse.name.toLowerCase().includes("site"))?.id ?? warehouses[0]?.id ?? "",
  projectId: "", ref: "", date: d(0),
});
const total = (i: Item) => Object.values(i.qty).reduce((a, b) => a + b, 0);
const level = (i: Item) => (total(i) === 0 ? "Out of stock" : total(i) <= i.min ? "Low stock" : "In stock");

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tab, setTab] = useState("stock");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState("");

  const load = async () => {
    const [stockItems, movementItems] = await Promise.all([
      getAllPages<Record<string, unknown>>("/inventory/stock"),
      getAllPages<Record<string, unknown>>("/inventory/movements"),
    ]);
    setItems(stockItems.map((record) => {
      const category = record.categoryId && typeof record.categoryId === "object" ? record.categoryId as Record<string, unknown> : null;
      const stock = Array.isArray(record.stock) ? record.stock as Record<string, unknown>[] : [];
      const qty: Record<string, number> = {};
      for (const balance of stock) {
        const warehouse = balance.warehouse && typeof balance.warehouse === "object" ? balance.warehouse as Record<string, unknown> : null;
        if (warehouse?._id) qty[String(warehouse._id)] = Number(balance.quantity ?? 0);
      }
      return { id: String(record._id), name: String(record.itemName ?? ""), sku: String(record.sku ?? ""), category: String(category?.categoryName ?? ""), unit: String(record.unit ?? "Nos"), min: Number(record.minimumStock ?? 0), qty };
    }));
    setMoves(movementItems.map((record) => {
      const item = record.item && typeof record.item === "object" ? record.item as Record<string, unknown> : null;
      const from = record.fromWarehouse && typeof record.fromWarehouse === "object" ? record.fromWarehouse as Record<string, unknown> : null;
      const to = record.toWarehouse && typeof record.toWarehouse === "object" ? record.toWarehouse as Record<string, unknown> : null;
      const project = record.project && typeof record.project === "object" ? record.project as Record<string, unknown> : null;
      const createdBy = record.createdBy && typeof record.createdBy === "object" ? record.createdBy as Record<string, unknown> : null;
      return { id: String(record._id), date: String(record.movementDate ?? "").slice(0, 10), type: String(record.type), item: String(item?.itemName ?? ""), qty: Number(record.quantity ?? 0), from: String(from?.locationName ?? ""), to: String(to?.locationName ?? ""), ref: String(project?.projectCode ?? record.reference ?? ""), by: String(createdBy?.name ?? "") };
    }));
    setRequestError("");
  };
  useEffect(() => {
    let active = true;
    Promise.all([load(), api.get("/inventory/options")]).then(([, optionsResponse]) => {
      const locationRecords = optionsResponse.data?.data?.warehouses;
      const projectRecords = optionsResponse.data?.data?.projects;
      if (!Array.isArray(locationRecords)) throw new Error("The server returned invalid warehouse options.");
      if (!Array.isArray(projectRecords)) throw new Error("The server returned invalid project options.");
      setWarehouses(locationRecords.map((record: Record<string, unknown>) => ({ id: String(record._id), name: String(record.locationName) })));
      setProjects(projectRecords.map((record: Record<string, unknown>) => ({ id: String(record._id), name: String(record.projectCode) })));
    }).catch((error: { userMessage?: string; message?: string }) => {
      if (active) setRequestError(error.userMessage || error.message || "Could not load inventory.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stockRows = useMemo(() => items.filter((i) => (filter === "all" || level(i) === filter) && `${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(q.toLowerCase())), [items, q, filter]);
  const warehouseRows = useMemo(() => items.flatMap((i) => warehouses.map((warehouse) => ({
    id: `${i.id}-${warehouse.id}`,
    item: i,
    location: warehouse.name,
    qty: i.qty[warehouse.id] ?? 0,
  }))).filter(({ item, location }) =>
    (filter === "all" || location === filter) && `${location} ${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(q.toLowerCase())
  ), [items, q, filter, warehouses]);
  const moveRows = useMemo(() => moves.filter((m) => {
    const selectedType = tab === "stock-in" ? "Received" : tab === "material-issue" ? "Issued" : tab === "returns" ? "Returned" : null;
    const matchesTab = tab === "ledger" || m.type === selectedType;
    const matchesFilter = tab !== "ledger" || filter === "all" || m.type === filter;
    return matchesTab && matchesFilter && `${m.item} ${m.ref} ${m.by}`.toLowerCase().includes(q.toLowerCase());
  }), [moves, q, filter, tab]);

  const set = (k: keyof Draft) => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const item = items.find((i) => i.id === draft.item);
  const qty = Number(draft.qty);
  const avail = item && needFrom(draft.type) ? item.qty[draft.from] ?? 0 : null;
  const error = !item ? "Select an item." : !(qty > 0) ? "Enter a quantity." : !draft.to ? "Select a destination warehouse." : avail !== null && qty > avail ? `Only ${avail} ${item.unit} available in ${warehouses.find((w) => w.id === draft.from)?.name}.`
    : needFrom(draft.type) && draft.from === draft.to ? "From and to location must differ."
    : (draft.type === "Issued" || draft.type === "Returned") && !draft.projectId ? "Select the related solar project." : "";

  const save = async () => {
    if (error || !item) return;
    setSaving(true);
    setRequestError("");
    try {
      await api.post("/inventory/movements", {
        itemId: item.id, type: draft.type, quantity: qty,
        fromWarehouseId: needFrom(draft.type) ? draft.from : null, toWarehouseId: draft.to,
        projectId: draft.projectId || null, reference: draft.ref, movementDate: draft.date,
      });
      await load();
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not record stock movement.");
    } finally { setSaving(false); }
  };

  const renderStockTable = (rows: Item[], emptyMessage: string) => (
    <Table>
      <TableHeader className="bg-slate-50/70">
        <TableRow>{["Item", "Category", ...warehouses.map((warehouse) => warehouse.name), "Total", "Reorder at", "Level"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={i.name} /><div><p className="font-semibold">{i.name}</p><p className="text-sm text-muted-foreground">{i.sku}</p></div></div></TableCell>
            <TableCell className="px-4"><Chip>{i.category}</Chip></TableCell>
            {warehouses.map((warehouse) => <TableCell key={warehouse.id} className="px-4">{i.qty[warehouse.id] ?? 0}</TableCell>)}
            <TableCell className="px-4 font-semibold">{total(i)} {i.unit}</TableCell>
            <TableCell className="px-4 text-muted-foreground">{i.min}</TableCell>
            <TableCell className="px-4"><StatusBadge tone={stockTone[level(i)]}>{level(i)}</StatusBadge></TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const renderMoveTable = (rows: Move[], emptyMessage: string) => (
    <Table>
      <TableHeader className="bg-slate-50/70">
        <TableRow>{["Date", "Item", "Type", "Qty", "Movement", "Reference", "By"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="px-4 py-3">{fmtDate(m.date)}</TableCell>
            <TableCell className="px-4 font-semibold">{m.item}</TableCell>
            <TableCell className="px-4"><StatusBadge tone={typeTone[m.type]}>{m.type}</StatusBadge></TableCell>
            <TableCell className="px-4 font-semibold">{m.qty}</TableCell>
            <TableCell className="px-4"><span className="inline-flex items-center gap-2 text-sm">{m.from || "Supplier / project"} <ArrowRight size={14} className="text-muted-foreground" /> {m.to || "Project site"}</span></TableCell>
            <TableCell className="px-4 text-muted-foreground">{m.ref || "-"}</TableCell>
            <TableCell className="px-4">{m.by}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const filterOptions = tab === "stock"
    ? STOCK_FILTERS
    : tab === "warehouses"
        ? warehouses.map((warehouse) => warehouse.name)
        : tab === "ledger"
          ? TYPES
          : [];
  const filterLabel = tab === "stock" ? "All stock levels" : tab === "warehouses" ? "All locations" : "All movement types";
  const movementType = tab === "stock-in" ? "Received" : tab === "material-issue" ? "Issued" : tab === "returns" ? "Returned" : "Received";

  return (
    <div className="!space-y-2">
      <PageHeader title="Inventory & stock movements" subtitle="Live stock by location, with every receipt, issue, transfer and return on record.">
        <Button size="lg" className={darkBtn} onClick={() => { setDraft(blank(movementType, items, warehouses)); setFormOpen(true); }}><Plus /> {tab === "stock-in" ? "Record stock in" : tab === "material-issue" ? "Issue material" : tab === "returns" ? "Record return" : "Record movement"}</Button>
      </PageHeader>

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-5 text-sm text-muted-foreground">Loading inventory…</Panel>}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Boxes size={24} />} value={items.length} label="Items tracked" />
        <StatCard icon={<AlertTriangle size={24} />} value={items.filter((i) => level(i) !== "In stock").length} label="Low / out of stock" />
        <StatCard icon={<ArrowRightLeft size={24} />} value={moves.length} label="Movements logged" />
      </div>

      <Panel className="overflow-hidden">
        <Tabs value={tab} onValueChange={(t) => { setTab(t); setFilter("all"); }}>
          <div className="flex flex-wrap gap-3 p-4">
            <TabsList className={pillList}>
              <TabsTrigger value="stock" className={pillTrig}>Stock Overview</TabsTrigger>
              <TabsTrigger value="warehouses" className={pillTrig}>Warehouses</TabsTrigger>
              <TabsTrigger value="stock-in" className={pillTrig}>Stock In</TabsTrigger>
              <TabsTrigger value="material-issue" className={pillTrig}>Material Issue</TabsTrigger>
              <TabsTrigger value="returns" className={pillTrig}>Returns</TabsTrigger>
              <TabsTrigger value="ledger" className={pillTrig}>Stock Ledger</TabsTrigger>
            </TabsList>
            <div className="relative min-w-[200px] flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "stock" || tab === "warehouses" ? "Search by item, SKU or location" : "Search by item, reference or person"} aria-label="Search" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
            </div>
            {filterOptions.length > 0 && <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{filterLabel}</SelectItem>
                {filterOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>}
          </div>

          <TabsContent value="stock">{renderStockTable(stockRows, "No items match.")}</TabsContent>

          <TabsContent value="ledger">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>{["Date", "Item", "Type", "Qty", "Movement", "Reference", "By"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {moveRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="px-4 py-3">{fmtDate(m.date)}</TableCell>
                    <TableCell className="px-4 font-semibold">{m.item}</TableCell>
                    <TableCell className="px-4"><StatusBadge tone={typeTone[m.type]}>{m.type}</StatusBadge></TableCell>
                    <TableCell className="px-4 font-semibold">{m.qty}</TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex items-center gap-2 text-sm">{m.from || "Supplier / project"} <ArrowRight size={14} className="text-muted-foreground" /> {m.to || "Project site"}</span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">{m.ref || "—"}</TableCell>
                    <TableCell className="px-4">{m.by}</TableCell>
                  </TableRow>
                ))}
                {moveRows.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-muted-foreground">No movements match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="warehouses">
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow>{["Warehouse / location", "Item", "SKU", "Quantity", "Unit"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {warehouseRows.map(({ id, item: stockItem, location, qty: locationQty }) => (
                  <TableRow key={id}>
                    <TableCell className="px-4 py-3 font-semibold">{location}</TableCell>
                    <TableCell className="px-4">{stockItem.name}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">{stockItem.sku}</TableCell>
                    <TableCell className="px-4 font-semibold">{locationQty}</TableCell>
                    <TableCell className="px-4">{stockItem.unit}</TableCell>
                  </TableRow>
                ))}
                {warehouseRows.length === 0 && <TableRow><TableCell colSpan={5} className="py-14 text-center text-muted-foreground">No warehouse stock matches.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="stock-in">{renderMoveTable(moveRows, "No stock receipts match.")}</TabsContent>
          <TabsContent value="material-issue">{renderMoveTable(moveRows, "No material issues match.")}</TabsContent>
          <TabsContent value="returns">{renderMoveTable(moveRows, "No stock returns match.")}</TabsContent>
        </Tabs>
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.type === "Received" ? "Record stock receipt" : draft.type === "Issued" ? "Issue material" : draft.type === "Returned" ? "Record stock return" : "Record stock transfer"} description="Warehouse and site stock update automatically when you save." error={error} saveLabel={draft.type === "Received" ? "Save receipt" : draft.type === "Issued" ? "Issue material" : draft.type === "Returned" ? "Save return" : "Save transfer"} onSave={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField className="sm:col-span-2" label="Movement type" value={draft.type} onChange={set("type")} options={TYPES} />
          <div className="grid gap-2 sm:col-span-2"><label className="text-sm font-semibold">Item</label><Select value={draft.item} onValueChange={(value) => set("item")(value ?? "")}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{items.map((stockItem) => <SelectItem key={stockItem.id} value={stockItem.id}>{stockItem.name} · {stockItem.sku}</SelectItem>)}</SelectContent></Select></div>
          {needFrom(draft.type) && <div className="grid gap-2"><label className="text-sm font-semibold">{draft.type === "Returned" ? "Return from" : "From location"}</label><Select value={draft.from} onValueChange={(value) => set("from")(value ?? "")}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent></Select></div>}
          {needTo(draft.type) && <div className="grid gap-2"><label className="text-sm font-semibold">{draft.type === "Received" ? "Receive into" : draft.type === "Returned" ? "Return to warehouse" : draft.type === "Issued" ? "Issue to site" : "To location"}</label><Select value={draft.to} onValueChange={(value) => set("to")(value ?? "")}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select destination" /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="sm:col-span-2">
            <TextField label={`Quantity${item ? ` (${item.unit})` : ""}`} type="number" min={0} value={draft.qty} onChange={set("qty")} />
            {avail !== null && item && <p className="mt-1.5 text-sm text-muted-foreground">Available in {draft.from}: {avail} {item.unit}</p>}
          </div>
          {(draft.type === "Received" || draft.type === "Transfer") && <TextField className="sm:col-span-2" label={draft.type === "Received" ? "PO / supplier reference" : "Reference"} value={draft.ref} onChange={set("ref")} placeholder={draft.type === "Received" ? "PO-2026-031 · Sunrise Solar" : "Transfer note"} />}
          {(draft.type === "Issued" || draft.type === "Returned") && <div className="grid gap-2 sm:col-span-2"><label className="text-sm font-semibold">Solar project</label><Select value={draft.projectId} onValueChange={(projectId) => { const project = projects.find((entry) => entry.id === projectId); setDraft((current) => ({ ...current, projectId, ref: project?.name ?? current.ref })); }}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>}
          <TextField label="Date" type="date" value={draft.date} onChange={set("date")} />
          <p className="text-sm text-muted-foreground sm:col-span-2">Movement is recorded under your signed-in account.</p>
        </div>
      </SideSheet>
    </div>
  );
}
