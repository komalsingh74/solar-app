"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, ViewDialog } from "@/components/ui/page-layout";
import { darkBtn, d, fmtDate, inr, outBtn, pillList, pillTrig, thCls } from "@/components/master/module-kit";
import { ME, STAGES, biz, docState, useCustomers, type Customer } from "@/components/crm/customer-store";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, FileText, IndianRupee, MessageCircle, Phone, Plus, Search, Wrench, Zap } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MASTER_HREF = "/master/customer"; // change to your Customer Master route
const LIFECYCLE = ["Prospect", "In installation", "Payment due", "Completed"];
const stageTone: Record<string, Tone> = { Prospect: "slate", "In installation": "indigo", "Payment due": "red", Completed: "green" };
const quoteTone: Record<string, Tone> = { Sent: "amber", Accepted: "green", Rejected: "red" };
const ticketTone: Record<string, Tone> = { Open: "red", Assigned: "amber", "In progress": "indigo", Resolved: "green" };
const wa = (p: string) => { const x = p.replace(/\D/g, ""); return `https://wa.me/${x.length === 10 ? "91" + x : x}`; };

function Kpi({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-xl font-bold ${tone}`}>{value}</p></div>;
}

export default function CustomersPage() {
  const [s, update, storeStatus] = useCustomers();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [viewId, setViewId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const view = s.customers.find((c) => c.id === viewId);

  const all = s.customers.filter((c) => c.status === "Active").map((c) => ({ c, b: biz(c) }));
  const rows = useMemo(
    () => all.filter(({ c, b }) => (stage === "all" || b.stage === stage) && `${c.name} ${c.contact} ${c.phone} ${c.city} ${c.code}`.toLowerCase().includes(q.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.customers, q, stage],
  );
  const addNote = (c: Customer) => {
    if (!note.trim()) return;
    void update((st) => ({ ...st, customers: st.customers.map((x) => (x.id === c.id ? {
      ...x,
      notes: [x.notes, note.trim()].filter(Boolean).join("\n"),
      activity: [{ title: note.trim(), meta: `Today · ${ME}` }, ...x.activity],
    } : x)) }));
    setNote("");
  };

  return (
    <div className="!space-y-2">
      <PageHeader title="Customers" subtitle="Projects, quotations, payments, service and activity for every customer.">
        <Link href={MASTER_HREF} className={cn(buttonVariants({ size: "lg" }), darkBtn)}><Plus /> Add customer record</Link>
      </PageHeader>

      {storeStatus.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{storeStatus.error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Zap size={24} />} value={all.reduce((t, x) => t + x.b.active.length, 0)} label="Active projects" />
        <StatCard icon={<IndianRupee size={24} />} value={inr(all.reduce((t, x) => t + x.b.outstanding, 0))} label="Outstanding balance" />
        <StatCard icon={<Wrench size={24} />} value={all.reduce((t, x) => t + x.b.openComplaints, 0)} label="Open complaints" />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer, phone or city" aria-label="Search customers" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={stage || null} onValueChange={(value) => setStage(value ?? "")}>
            <SelectTrigger className="h-10 w-[190px] rounded-xl border-slate-200 bg-slate-50" aria-label="Lifecycle stage"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All stages</SelectItem>{LIFECYCLE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70"><TableRow>{["Customer", "Project", "Order value", "Payment", "Outstanding", "Service", "Owner", "Stage"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.map(({ c, b }) => {
              const p = c.projects.find((x) => x.stage !== STAGES[STAGES.length - 1]) ?? c.projects[0];
              return (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => { setNote(""); setViewId(c.id); }}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={c.name} /><div><p className="font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.city} · {c.phone}</p></div></div></TableCell>
                  <TableCell className="px-4">{p ? <div><p className="font-medium">{p.code} · {p.kw} kW{c.projects.length > 1 ? ` +${c.projects.length - 1}` : ""}</p><p className="text-sm text-muted-foreground">{p.stage}</p></div> : <span className="text-muted-foreground">No project yet</span>}</TableCell>
                  <TableCell className="px-4 font-semibold">{b.order ? inr(b.order) : "—"}</TableCell>
                  <TableCell className="px-4">{b.order ? <><div className="h-2 w-24 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, (b.received / b.order) * 100)}%` }} /></div><p className="mt-1 text-sm text-muted-foreground">{inr(b.received)} received</p></> : "—"}</TableCell>
                  <TableCell className={`px-4 font-semibold ${b.outstanding > 0 && b.stage === "Payment due" ? "text-red-600" : ""}`}>{b.order ? inr(b.outstanding) : "—"}</TableCell>
                  <TableCell className="px-4">{b.openComplaints ? <StatusBadge tone="red">{b.openComplaints} open</StatusBadge> : <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="px-4">{c.owner}</TableCell>
                  <TableCell className="px-4"><StatusBadge tone={stageTone[b.stage]}>{b.stage}</StatusBadge></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground">{storeStatus.loading ? "Loading customers..." : "No customers match."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Panel>

      {view && (() => {
        const b = biz(view), ds = docState(view);
        return (
          <ViewDialog open onOpenChange={() => setViewId(null)} size="sm:max-w-3xl" title={view.name} description={`${view.code} · ${view.type} · ${[view.address, view.city].filter(Boolean).join(", ")}`}
            footer={<>
              <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
              <a href={wa(view.phone)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), outBtn)}><MessageCircle /> WhatsApp</a>
              <a href={`tel:${view.phone.replace(/\s/g, "")}`} className={cn(buttonVariants({ size: "lg" }), darkBtn)}><Phone /> Call {view.contact.split(" ")[0]}</a>
            </>}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Order value" value={b.order ? inr(b.order) : "—"} />
                <Kpi label="Received" value={inr(b.received)} tone="text-green-700" />
                <Kpi label="Outstanding" value={inr(b.outstanding)} tone={b.outstanding > 0 ? "text-red-600" : ""} />
                <Kpi label="Open complaints" value={b.openComplaints} tone={b.openComplaints ? "text-red-600" : ""} />
              </div>

              <Tabs defaultValue="overview">
                <TabsList className={`${pillList} mb-4 flex-wrap !h-auto`}>
                  {[["overview", "Overview"], ["quotes", `Quotations (${view.quotes.length})`], ["payments", `Payments (${view.payments.length})`], ["service", `Service (${view.complaints.length})`], ["timeline", "Timeline"]].map(([v, l]) => <TabsTrigger key={v} value={v} className={pillTrig}>{l}</TabsTrigger>)}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {view.projects.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">No project yet. {view.quotes.some((x) => x.status === "Sent") ? "A quotation is waiting for the customer’s decision. Follow up to close it." : "Create a quotation to move this customer forward."}</p>}
                  {view.projects.map((p) => {
                    const i = STAGES.indexOf(p.stage), pct = Math.round(((i + 1) / STAGES.length) * 100), late = p.target < d(0) && i < STAGES.length - 1;
                    return (
                      <div key={p.code} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{p.code} <Chip>{p.kw} kW</Chip></p><StatusBadge tone={i === STAGES.length - 1 ? "green" : late ? "red" : "indigo"}>{i === STAGES.length - 1 ? "Commissioned" : late ? "Delayed" : "On track"}</StatusBadge></div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${i === STAGES.length - 1 ? "bg-green-600" : "bg-indigo-600"}`} style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1.5 text-sm text-muted-foreground">{p.stage} · {pct}% complete</p>
                        <p className="mt-2 text-sm">Site engineer <span className="font-medium">{p.engineer}</span> · Crew <span className="font-medium">{p.crew}</span> · Target {fmtDate(p.target)}</p>
                      </div>
                    );
                  })}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <KV label="Relationship owner">{view.owner}</KV>
                    <KV label="Contact">{view.contact} · {view.phone}</KV>
                    <KV label="Documents">
                      <span className="inline-flex flex-wrap items-center gap-2"><FileText size={15} className="text-indigo-600" />{ds.have}/{ds.total} · <StatusBadge tone={ds.status === "Verified" ? "green" : ds.status === "Pending verification" ? "amber" : "red"}>{ds.status}</StatusBadge>
                        <Link href={MASTER_HREF} className="text-sm text-indigo-700 underline">Open in Customer Master</Link></span>
                    </KV>
                    {b.stage === "Payment due" && <KV label="Action"><span className="inline-flex items-center gap-1.5 text-red-600"><AlertCircle size={15} />Collect {inr(b.outstanding)}</span></KV>}
                  </div>
                </TabsContent>

                <TabsContent value="quotes">
                  <ul className="space-y-2.5">
                    {view.quotes.map((x) => <li key={x.no} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><div><p className="font-semibold">{x.no}</p><p className="text-sm text-muted-foreground">{fmtDate(x.date)}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{inr(x.amount)}</span><StatusBadge tone={quoteTone[x.status]}>{x.status}</StatusBadge></div></li>)}
                    {view.quotes.length === 0 && <li className="text-muted-foreground">No quotations yet.</li>}
                  </ul>
                </TabsContent>

                <TabsContent value="payments">
                  <ul className="space-y-2.5">
                    {view.payments.map((x, i) => <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><div><p className="font-semibold">{inr(x.amount)}</p><p className="text-sm text-muted-foreground">{x.mode} · {x.ref}</p></div><span className="text-sm text-muted-foreground">{fmtDate(x.date)}</span></li>)}
                    {view.payments.length === 0 && <li className="text-muted-foreground">No payments received yet.</li>}
                  </ul>
                  {b.order > 0 && <p className="mt-3 flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>Balance to collect</span><span className={`font-bold ${b.outstanding > 0 ? "text-red-600" : "text-green-700"}`}>{inr(b.outstanding)}</span></p>}
                </TabsContent>

                <TabsContent value="service">
                  <ul className="space-y-2.5">
                    {view.complaints.map((x) => <li key={x.code} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><div><p className="font-semibold">{x.issue}</p><p className="text-sm text-muted-foreground">{x.code} · {fmtDate(x.date)}</p></div><StatusBadge tone={ticketTone[x.status] ?? "slate"}>{x.status}</StatusBadge></li>)}
                    {view.complaints.length === 0 && <li className="text-muted-foreground">No complaints. Service history is clean.</li>}
                  </ul>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(view); }} placeholder="Add a note: call summary, promise, visit outcome…" aria-label="Add note" className="h-10 rounded-xl border-slate-200" />
                    <Button className={darkBtn} disabled={!note.trim()} onClick={() => addNote(view)}>Add note</Button>
                  </div>
                  <ol className="ml-2 border-l-2">
                    {view.activity.map((h, i) => (
                      <li key={i} className="relative pb-5 pl-6 last:pb-0"><span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-indigo-600" /><p className="font-semibold">{h.title}</p><p className="text-sm text-muted-foreground">{h.meta}</p></li>
                    ))}
                    {view.activity.length === 0 && <li className="pl-6 text-muted-foreground">No activity yet.</li>}
                  </ol>
                </TabsContent>
              </Tabs>
            </div>
          </ViewDialog>
        );
      })()}
    </div>
  );
}
