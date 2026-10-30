"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, AreaField, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, IndianRupee, Pencil, Plus, Printer, Search, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { showError } from "@/lib/toast";
import api from "@/lib/api";
import { useCustomers } from "@/components/crm/customer-store";

type Item = { id: string; name: string; qty: number; rate: number };
type Quote = { id: string; no: string; customerId: string; customer: string; kw: number; phase: string; items: Item[]; discount: number; gst: number; validDays: number; status: string; date: string; notes: string };
type Product = { id: string; name: string; unit: string; price: number; gst: number };

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Cancelled"];
const CAPACITIES = ["3", "5", "7", "10", "15"];
const tone: Record<string, Tone> = { Draft: "slate", Sent: "amber", Accepted: "green", Rejected: "red", Expired: "red", Cancelled: "slate" };
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const calc = (q: Quote) => {
  const sub = q.items.reduce((a, i) => a + i.qty * i.rate, 0);
  const disc = (sub * q.discount) / 100;
  const gst = ((sub - disc) * q.gst) / 100;
  return { sub, disc, gst, total: sub - disc + gst };
};
const blank = (): Quote => ({ id: "", no: "New quotation", customerId: "", customer: "", kw: 5, phase: "Single", items: [], discount: 0, gst: 0, validDays: 15, status: "Draft", date: new Date().toISOString().slice(0, 10), notes: "" });
const apiToQuote = (record: Record<string, unknown>): Quote => {
  const customer = record.customer && typeof record.customer === "object" ? record.customer as Record<string, unknown> : null;
  const items = Array.isArray(record.items) ? record.items as Record<string, unknown>[] : [];
  return {
    id: String(record._id ?? ""),
    no: String(record.quotationNumber ?? ""),
    customerId: String(customer?._id ?? record.customer ?? ""),
    customer: String(customer?.customerName ?? ""),
    kw: Number(record.solarCapacityKw ?? 0),
    phase: String(record.phase ?? "Single"),
    items: items.map((line) => {
      const product = line.item && typeof line.item === "object" ? line.item as Record<string, unknown> : null;
      return {
        id: String(product?._id ?? line.item ?? ""),
        name: String(line.itemName ?? product?.itemName ?? ""),
        qty: Number(line.quantity ?? 0),
        rate: Number(line.rate ?? 0),
      };
    }),
    discount: Number(record.discountValue ?? 0),
    gst: Number(record.gstPercent ?? 0),
    validDays: Number(record.validForDays ?? 15),
    status: String(record.status ?? "Draft"),
    date: record.issueDate ? String(record.issueDate).slice(0, 10) : "",
    notes: String(record.notes ?? record.termsAndConditions ?? ""),
  };
};

async function downloadQuotationPdf(quote: Quote) {
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF();
    const totals = calc(quote);
    const money = (amount: number) => inr(amount).replace(/₹/g, "INR ");
    doc.setFontSize(18);
    doc.text("Vanshika Solar Solution", 16, 20);
    doc.setFontSize(12);
    doc.text(`Quotation ${quote.no}`, 16, 32);
    doc.setFontSize(10);
    doc.text(`Customer: ${quote.customer}`, 16, 42);
    doc.text(`Date: ${quote.date}   Capacity: ${quote.kw} kW   Phase: ${quote.phase}`, 16, 50);
    doc.text(`Status: ${quote.status}   Valid for: ${quote.validDays} days`, 16, 58);
    autoTable(doc, {
      startY: 68,
      head: [["Item", "Quantity", "Rate", "Amount"]],
      body: quote.items.map((item) => [item.name, String(item.qty), money(item.rate), money(item.qty * item.rate)]),
      foot: [["Subtotal", "", "", money(totals.sub)], ["Discount", `${quote.discount}%`, "", money(totals.disc)], ["GST", `${quote.gst}%`, "", money(totals.gst)], ["Total", "", "", money(totals.total)]],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    const notes = quote.notes || "Subsidy is subject to eligibility and approval. Warranty and payment terms to be confirmed with the customer.";
    const finalY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(`Terms & notes: ${notes}`, 175), 16, finalY + 18);
    doc.save(`${quote.no}.pdf`);
  } catch { showError("Quotation PDF could not be generated. Please try again."); }
}

export default function QuotationsPage() {
  const [list, setList] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerStore] = useCustomers();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState<Quote>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<Quote>(blank());
  const [viewOpen, setViewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");

  const loadData = async () => {
    const [quoteResponse, itemResponse] = await Promise.all([
      api.get("/quotations", { params: { page: 1, limit: 100 } }),
      api.get("/masters/items", { params: { page: 1, limit: 100 } }),
    ]);
    const quoteItems = quoteResponse.data?.data?.items;
    const productsPage = itemResponse.data?.data?.items;
    if (!Array.isArray(quoteItems) || !Array.isArray(productsPage)) throw new Error("The server returned invalid quotation data.");
    const [moreQuotes, moreProducts] = await Promise.all([
      Promise.all(Array.from({ length: Math.max(0, (Number(quoteResponse.data?.data?.pagination?.pages) || 1) - 1) }, (_, index) =>
          api.get("/quotations", { params: { page: index + 2, limit: 100 } })
      )),
      Promise.all(Array.from({ length: Math.max(0, (Number(itemResponse.data?.data?.pagination?.pages) || 1) - 1) }, (_, index) =>
          api.get("/masters/items", { params: { page: index + 2, limit: 100 } })
      )),
    ]);
    const allQuotes = [...quoteItems, ...moreQuotes.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid quotation list.");
      return items;
    })];
    const allProducts = [...productsPage, ...moreProducts.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid item list.");
      return items;
    })];
    setList(allQuotes.map((item: Record<string, unknown>) => apiToQuote(item)));
    setProducts(allProducts.map((item: Record<string, unknown>) => ({
      id: String(item._id),
      name: String(item.itemName ?? ""),
      unit: String(item.unit ?? "Nos"),
      price: Number(item.unitPrice ?? 0),
      gst: Number(item.gstRate ?? 0),
    })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    loadData().catch((error: { userMessage?: string; message?: string }) => {
      if (active) setRequestError(error.userMessage || error.message || "Could not load quotations.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => list.filter((x) => (status === "all" || x.status === status) && `${x.customer} ${x.no}`.toLowerCase().includes(q.toLowerCase())), [list, q, status]);
  const quoted = list.reduce((a, x) => a + calc(x).total, 0);
  const t = calc(draft);
  const vt = calc(view);

  const openForm = (x: Quote) => { setDraft(structuredClone(x)); setFormOpen(true); };
  const set = <K extends keyof Quote>(k: K, v: Quote[K]) => setDraft((s) => ({ ...s, [k]: v }));
  const setItem = (i: number, k: keyof Item, v: string | number) => setDraft((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const setCustomer = (customerId: string) => {
    const customer = customerStore.customers.find((item) => item.apiId === customerId);
    setDraft((current) => ({ ...current, customerId, customer: customer?.name ?? "" }));
  };
  const setProduct = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, row) => row === index ? { ...item, id: product.id, name: product.name, rate: product.price } : item),
      gst: product.gst || current.gst,
    }));
  };
  const save = async () => {
    if (!draft.customerId || !draft.items.length || draft.items.some((item) => !item.id || item.qty <= 0)) return;
    setSaving(true);
    setRequestError("");
    try {
      const payload = {
        customerId: draft.customerId,
        solarCapacityKw: draft.kw,
        phase: draft.phase,
        validForDays: draft.validDays,
        items: draft.items.map((item) => ({ itemId: item.id, quantity: item.qty, rate: item.rate })),
        discountType: "Percentage",
        discountValue: draft.discount,
        gstPercent: draft.gst,
        status: draft.status,
        notes: draft.notes,
        termsAndConditions: draft.notes,
        issueDate: draft.date,
      };
      const response = draft.id
        ? await api.patch(`/quotations/${draft.id}`, payload)
        : await api.post("/quotations", payload);
      const saved = apiToQuote(response.data?.data?.item);
      setList((current) => draft.id
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setFormOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save quotation.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (quote: Quote) => {
    if (!window.confirm(`Delete quotation ${quote.no}?`)) return;
    setDeleting(quote.id);
    setRequestError("");
    try {
      await api.delete(`/quotations/${quote.id}`);
      setList((current) => current.filter((item) => item.id !== quote.id));
      if (view.id === quote.id) setViewOpen(false);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete quotation.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Quotations" subtitle="Solar capacity, panel and inverter items, pricing and printable quotations.">
        <Button size="lg" className="h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800" disabled={loading} onClick={() => openForm(blank())}><Plus /> New quotation</Button>
      </PageHeader>

      {requestError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<FileText size={24} />} value={list.length} label="Total quotations" />
        <StatCard icon={<Send size={24} />} value={list.filter((x) => x.status === "Sent").length} label="Awaiting reply" />
        <StatCard icon={<IndianRupee size={24} />} value={inr(quoted)} label="Value quoted" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer or quotation number" aria-label="Search quotations" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>{["Customer", "Capacity", "Date", "Amount", "Status"].map((h) => <TableHead key={h} className="h-12 px-4 text-sm font-semibold text-muted-foreground">{h}</TableHead>)}<TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={x.customer} /><div><p className="font-semibold">{x.customer}</p><p className="text-sm text-muted-foreground">{x.no}</p></div></div></TableCell>
                <TableCell className="px-4"><Chip>{x.kw} kW · {x.phase}</Chip></TableCell>
                <TableCell className="px-4">{x.date}</TableCell>
                <TableCell className="px-4 font-semibold">{inr(calc(x).total)}</TableCell>
                <TableCell className="px-4"><StatusBadge tone={tone[x.status]}>{x.status}</StatusBadge></TableCell>
                <TableCell className="px-4 text-right">
                  <Button variant="ghost" size="icon" aria-label={`View ${x.no}`} onClick={() => { setView(x); setViewOpen(true); }}><Eye /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${x.no}`} onClick={() => openForm(x)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${x.no}`} title="Delete quotation" disabled={deleting === x.id} onClick={() => void remove(x)}><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-14 text-center text-muted-foreground">{loading ? "Loading quotations..." : "No quotations found. Create a new quotation to get started."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Panel>

      {/* Add / Edit → wide Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 !max-w-5xl">
          <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left">
            <SheetTitle className="text-xl font-bold">{draft.id ? `Edit ${draft.no}` : "New quotation"}</SheetTitle>
            <SheetDescription>Set the customer, items and pricing, then save.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-6">
        <Tabs defaultValue="customer">
          <TabsList className={tabsListCls}>
            <TabsTrigger value="customer" className={tabCls}>Customer</TabsTrigger>
            <TabsTrigger value="items" className={tabCls}>Items</TabsTrigger>
            <TabsTrigger value="pricing" className={tabCls}>Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">Customer
              <select value={draft.customerId} onChange={(event) => setCustomer(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal">
                <option value="">Select a customer</option>{customerStore.customers.filter((customer) => customer.status === "Active").map((customer) => <option key={customer.apiId} value={customer.apiId}>{customer.name} · {customer.phone}</option>)}
              </select>
            </label>
            <SelectField label="Solar capacity (kW)" value={String(draft.kw)} options={CAPACITIES} onChange={(v) => setDraft((s) => ({ ...s, kw: Number(v), items: buildItems(Number(v)) }))} />
            <SelectField label="Phase" value={draft.phase} onChange={(v) => set("phase", v)} options={["Single", "Three"]} />
            <TextField label="Valid for (days)" type="number" min={1} value={draft.validDays} onChange={(v) => set("validDays", Number(v))} />
            <SelectField label="Status" value={draft.status} onChange={(v) => set("status", v)} options={STATUSES} />
            <p className="text-sm text-muted-foreground sm:col-span-2">Changing the capacity refills panel and inverter items for that size.</p>
          </TabsContent>

          <TabsContent value="items">
            <div className="space-y-3">
              {draft.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_72px_110px_40px] items-end gap-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">{i === 0 ? "Item" : " "}
                    <select aria-label="Item name" value={it.id} onChange={(event) => setProduct(i, event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                      <option value="">Select item</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                  </label>
                  <TextField label={i === 0 ? "Qty" : ""} aria-label="Quantity" type="number" min={0} value={it.qty} onChange={(v) => setItem(i, "qty", Number(v))} />
                  <TextField label={i === 0 ? "Rate (₹)" : ""} aria-label="Rate" type="number" min={0} value={it.rate} onChange={(v) => setItem(i, "rate", Number(v))} />
                  <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Remove item" onClick={() => set("items", draft.items.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="lg" className="mt-4 rounded-xl" onClick={() => set("items", [...draft.items, { id: "", name: "", qty: 1, rate: 0 }])}><Plus /> Add item</Button>
          </TabsContent>

          <TabsContent value="pricing" className="grid gap-4 sm:grid-cols-2">
            <TextField label="Discount (%)" type="number" min={0} value={draft.discount} onChange={(v) => set("discount", Number(v))} />
            <TextField label="GST (%)" type="number" min={0} step="0.1" value={draft.gst} onChange={(v) => set("gst", Number(v))} />
            <AreaField className="sm:col-span-2" label="Terms & notes" rows={4} value={draft.notes} onChange={(v) => set("notes", v)} placeholder="Payment terms, subsidy note, warranty…" />
            <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm sm:col-span-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{inr(t.sub)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-medium">−{inr(t.disc)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="font-medium">{inr(t.gst)}</span></div>
              <div className="flex justify-between border-t pt-2 text-sm font-bold"><span>Total</span><span>{inr(t.total)}</span></div>
            </div>
          </TabsContent>
        </Tabs>
          </div>
          <SheetFooter className="flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-sm font-bold sm:mr-auto">{draft.customer.trim() ? `Total ${inr(t.total)}` : <span className="font-normal text-muted-foreground">Customer name is required.</span>}</span>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-10 flex-1 rounded-xl border-slate-200 px-4 sm:flex-none" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button size="lg" className="h-10 flex-1 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800 sm:flex-none" disabled={!draft.customerId || !draft.items.length || draft.items.some((item) => !item.id || item.qty <= 0) || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save quotation"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View → Dialog (printable quotation) */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 flex-row items-center gap-2.5 rounded-xl bg-slate-50/70 p-2.5 pr-10">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-indigo-50 text-indigo-700"><FileText size={18} /></span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-slate-900">{view.no}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-500">{`${view.customer} · ${view.date}`}</DialogDescription>
            </div>
            <StatusBadge tone={tone[view.status] ?? "slate"}>{view.status}</StatusBadge>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
        <style>{`@media print{body *{visibility:hidden}#print-area,#print-area *{visibility:visible}#print-area{position:fixed;inset:0;padding:32px;background:#fff;color:#111}}`}</style>
        <div id="print-area">
          <div className="flex items-start justify-between">
            <div><p className="text-lg font-bold">Vanshika Solar</p><p className="text-sm text-muted-foreground">Agra, Uttar Pradesh</p></div>
            <div className="text-right text-sm text-muted-foreground"><p className="font-semibold text-foreground">{view.no}</p><p>{view.date} · Valid {view.validDays} days</p></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><KV label="Prepared for">{view.customer}</KV><KV label="System">{view.kw} kW on-grid</KV><KV label="Phase">{view.phase}</KV></div>
          <Table className="mt-4">
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>{view.items.map((it, i) => <TableRow key={i}><TableCell>{it.name}</TableCell><TableCell>{it.qty}</TableCell><TableCell className="text-right font-medium">{inr(it.qty * it.rate)}</TableCell></TableRow>)}</TableBody>
          </Table>
          <div className="ml-auto mt-4 w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{inr(vt.sub)}</span></div>
            {vt.disc > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({view.discount}%)</span><span>−{inr(vt.disc)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>GST ({view.gst}%)</span><span>{inr(vt.gst)}</span></div>
            <div className="flex justify-between rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><span>Total</span><span>{inr(vt.total)}</span></div>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{view.notes || "Subsidy, if eligible, is credited by the government after commissioning. Warranty: panels 25 years, inverter 5 years."}</p>
        </div>
          </div>
          <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-end">
            <Button variant="outline" size="lg" className="h-10 rounded-xl border-slate-200 px-4" onClick={() => setViewOpen(false)}>Close</Button>
            <Button variant="outline" size="lg" className="h-10 rounded-xl border-slate-200 px-4" onClick={() => { setViewOpen(false); openForm(view); }}><Pencil /> Edit</Button>
            <Button variant="outline" size="lg" className="h-10 rounded-xl border-slate-200 px-4" onClick={() => void downloadQuotationPdf(view)}><Download /> Download PDF</Button>
            <Button size="lg" className="h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800" onClick={() => window.print()}><Printer /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



