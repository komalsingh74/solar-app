"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Download, FileText, Banknote, CircleCheck, TriangleAlert, Send, Receipt, Pencil, Trash2 } from "lucide-react";
import { exportSimplePdf } from "@/lib/export";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";
import {
  Btn,
  Card,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Progress,
  SearchBox,
  SectionTitle,
  StatCard,
  StatGrid,
  TableFooter,
  TableToolbar,
  Tabs,
  TODAY,
  daysBetween,
  fmtDate,
  inputCls,
  inr,
  type Tone,
} from "@/components/erp/erp-ui";

type Inv = {
  id: string;
  dbId: string;
  customerId: string;
  projectId: string;
  customer: string;
  project: string;
  type: "Tax invoice" | "Proforma";
  issued: string;
  due: string;
  taxable: number;
  gstRate: number;
  paid: number;
  sent: boolean;
};
type Option = { id: string; name: string; customerId?: string };

type Status = "Draft" | "Sent" | "Partially paid" | "Overdue" | "Paid";

const fromApi = (record: Record<string, unknown>): Inv => {
  const customer = record.customer && typeof record.customer === "object" ? record.customer as Record<string, unknown> : null;
  const project = record.project && typeof record.project === "object" ? record.project as Record<string, unknown> : null;
  return {
    id: String(record.invoiceNumber ?? record._id ?? ""),
    dbId: String(record._id ?? ""),
    customerId: String(customer?._id ?? record.customer ?? ""),
    projectId: String(project?._id ?? record.project ?? ""),
    customer: String(customer?.customerName ?? ""),
    project: project ? `${String(project.projectCode ?? "")} · ${Number(project.systemSizeKw ?? 0)} kW` : "—",
    type: String(record.type ?? "Tax invoice") as Inv["type"],
    issued: String(record.issueDate ?? "").slice(0, 10), due: String(record.dueDate ?? "").slice(0, 10),
    taxable: Number(record.taxableAmount ?? 0), gstRate: Number(record.gstRate ?? 0),
    paid: Number(record.paidAmount ?? 0),
    sent: record.status === "Sent",
  };
};

const total = (i: Inv) => i.taxable * (1 + i.gstRate / 100);
const gst = (i: Inv) => i.taxable * (i.gstRate / 100);

function statusOf(i: Inv): Status {
  if (i.paid >= total(i) - 0.5) return "Paid";
  if (!i.sent) return "Draft";
  if (i.due < TODAY) return "Overdue";
  return i.paid > 0 ? "Partially paid" : "Sent";
}

const tone: Record<Status, Tone> = {
  Draft: "slate",
  Sent: "sky",
  "Partially paid": "amber",
  Overdue: "red",
  Paid: "emerald",
};

/* ---------- page ---------- */

export default function InvoicesPage() {
  const [list, setList] = useState<Inv[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [tab, setTab] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Inv | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Inv | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [paymentReference, setPaymentReference] = useState("");
  const load = useCallback(async () => {
    const [records, optionsResponse] = await Promise.all([
      getAllPages<Record<string, unknown>>("/invoices"),
      api.get("/invoices/options"),
    ]);
    setList(records.map(fromApi));
    const options = optionsResponse.data?.data;
    setCustomers((options?.customers ?? []).map((customer: Record<string, unknown>) => ({ id: String(customer._id), name: String(customer.customerName) })));
    setProjects((options?.projects ?? []).map((project: Record<string, unknown>) => {
      const customer = project.customer && typeof project.customer === "object" ? project.customer as Record<string, unknown> : null;
      return { id: String(project._id), name: `${String(project.projectCode)} · ${Number(project.systemSizeKw ?? 0)} kW`, customerId: String(customer?._id ?? "") };
    }));
    setRequestError("");
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load invoices."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const live = list.filter((i) => i.sent || statusOf(i) === "Paid");
  const invoiced = live.reduce((s, i) => s + total(i), 0);
  const received = list.reduce((s, i) => s + i.paid, 0);
  const outstanding = live.reduce((s, i) => s + Math.max(total(i) - i.paid, 0), 0);
  const overdueRows = list.filter((i) => statusOf(i) === "Overdue");
  const overdueAmt = overdueRows.reduce((s, i) => s + (total(i) - i.paid), 0);

  // receivables ageing
  const unpaid = list.filter((i) => i.sent && statusOf(i) !== "Paid");
  const bucket = (test: (days: number) => boolean) =>
    unpaid.filter((i) => test(daysBetween(i.due, TODAY))).reduce((s, i) => s + (total(i) - i.paid), 0);
  const ageing = [
    { label: "Not yet due", amt: bucket((d) => d <= 0), tone: "indigo" as const },
    { label: "1 to 15 days late", amt: bucket((d) => d > 0 && d <= 15), tone: "amber" as const },
    { label: "16 to 30 days late", amt: bucket((d) => d > 15 && d <= 30), tone: "amber" as const },
    { label: "Over 30 days late", amt: bucket((d) => d > 30), tone: "red" as const },
  ];
  const maxAge = Math.max(...ageing.map((a) => a.amt), 1);

  const taxableSum = live.reduce((s, i) => s + i.taxable, 0);
  const gstSum = live.reduce((s, i) => s + gst(i), 0);

  const statuses: Status[] = ["Draft", "Sent", "Partially paid", "Overdue", "Paid"];
  const tabs = [
    { key: "all" as const, label: "All", count: list.length },
    ...statuses.map((s) => ({ key: s, label: s, count: list.filter((i) => statusOf(i) === s).length })),
  ];

  const visible = list.filter((i) => {
    if (tab !== "all" && statusOf(i) !== tab) return false;
    const q = query.trim().toLowerCase();
    return !q || [i.id, i.customer, i.project].some((v) => v.toLowerCase().includes(q));
  });

  const send = async (invoice: Inv) => {
    try {
      const response = await api.post(`/invoices/${invoice.dbId}/send`);
      const saved = fromApi(response.data?.data?.item);
      setList((current) => current.map((item) => item.dbId === invoice.dbId ? saved : item));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not send invoice.");
    }
  };
  const markPaid = async () => {
    if (!paymentInvoice) return;
    try {
      await api.post("/payments", {
        projectId: paymentInvoice.projectId || undefined, invoiceId: paymentInvoice.dbId,
        amount: Number(paymentAmount), mode: paymentMode, source: "Customer",
        paymentDate, reference: paymentReference,
      });
      await load();
      setPaymentInvoice(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not record invoice payment.");
    }
  };
  const removeDraft = async (invoice: Inv) => {
    if (!window.confirm(`Delete draft ${invoice.id}?`)) return;
    try {
      await api.delete(`/invoices/${invoice.dbId}`);
      setList((current) => current.filter((item) => item.dbId !== invoice.dbId));
      setRequestError("");
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete invoice.");
    }
  };

  return (
    <div className="min-w-0 !space-y-2">
      <PageHeader
        eyebrow="Finance"
        title="Invoices"
        desc="Create GST invoices, send them to customers and see who still owes you."
        actions={
          <>
            <Btn variant="primary" icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
              Create invoice
            </Btn>
          </>
        }
      />

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Card className="p-5 text-sm text-slate-500">Loading invoices...</Card>}
      <StatGrid>
        <StatCard dark label="Total invoiced" value={inr(invoiced)} sub="Including GST, sent invoices" icon={FileText} />
        <StatCard label="Received" value={inr(received)} sub="Payments recorded" icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="Outstanding" value={inr(outstanding)} sub="Still to collect" icon={Banknote} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Overdue" value={inr(overdueAmt)} sub={`${overdueRows.length} invoices past due date`} icon={TriangleAlert} tint="bg-red-50 text-red-600" />
      </StatGrid>

      <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <SectionTitle title="Receivables ageing" sub="How long unpaid money has been waiting" />
          <div className="mt-5 space-y-4">
            {ageing.map((a) => (
              <div key={a.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{a.label}</span>
                  <span className="tabular-nums text-slate-500">{inr(a.amt)}</span>
                </div>
                <Progress value={(a.amt / maxAge) * 100} tone={a.tone === "indigo" ? "indigo" : a.tone} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="GST summary" sub="Sent and paid invoices" />
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Taxable value</dt>
              <dd className="font-medium tabular-nums text-slate-900">{inr(taxableSum)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GST collected</dt>
              <dd className="font-medium tabular-nums text-slate-900">{inr(gstSum)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">Total billed</dt>
              <dd className="font-bold tabular-nums text-slate-900">{inr(taxableSum + gstSum)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-400">Confirm applicable GST rates with your CA.</p>
        </Card>
      </section>

      <Card>
        <TableToolbar>
          <Tabs items={tabs} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search invoice, customer, project..." />
        </TableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 sm:px-6">Invoice</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Due date</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-right">Balance</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((i) => {
                const st = statusOf(i);
                const bal = Math.max(total(i) - i.paid, 0);
                const late = st === "Overdue" ? daysBetween(i.due, TODAY) : 0;
                return (
                  <tr key={i.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Receipt size={17} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{i.id}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {i.type} · {fmtDate(i.issued)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-slate-800">{i.customer}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{i.project}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-slate-700">{fmtDate(i.due)}</p>
                      {late > 0 && <p className="mt-0.5 text-xs font-medium text-red-600">{late} days late</p>}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900">{inr(total(i))}</td>
                    <td className="px-3 py-4 text-right tabular-nums text-slate-600">{bal ? inr(bal) : "-"}</td>
                    <td className="px-3 py-4">
                      <Chip tone={tone[st]}>{st}</Chip>
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      <div className="flex justify-end gap-1.5">
                        {st === "Draft" && (
                          <>
                            <button type="button" aria-label={`Edit ${i.id}`} onClick={() => { setEditing(i); setOpen(true); }}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"><Pencil size={14} /></button>
                            <button type="button" aria-label={`Delete ${i.id}`} onClick={() => void removeDraft(i)}
                              className="rounded-lg border border-slate-200 p-1.5 text-red-600 transition hover:bg-red-50"><Trash2 size={14} /></button>
                          </>
                        )}
                        {st === "Draft" && (
                          <Btn size="sm" variant="primary" icon={Send} onClick={() => void send(i)}>
                            Send
                          </Btn>
                        )}
                        {st !== "Draft" && st !== "Paid" && (
                          <Btn size="sm" onClick={() => {
                            setPaymentInvoice(i);
                            setPaymentAmount(String(bal));
                            setPaymentMode("Cash");
                            setPaymentDate(TODAY);
                            setPaymentReference("");
                          }}>
                            Record payment
                          </Btn>
                        )}
                        <button
                          type="button"
                          aria-label={`Download ${i.id}`}
                          title={`Download ${i.id} as PDF`}
                          onClick={() => void exportSimplePdf(i.id, [["Customer", i.customer], ["Project", i.project], ["Invoice type", i.type], ["Issued", i.issued], ["Due", i.due], ["Taxable amount", inr(i.taxable)], [`GST (${i.gstRate}%)`, inr(gst(i))], ["Invoice total", inr(total(i))], ["Paid", inr(i.paid)], ["Outstanding", inr(Math.max(total(i) - i.paid, 0))], ["Status", statusOf(i)]], i.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && <EmptyState icon={FileText} title="No invoices found" text="Change the filters or create a new invoice." />}
        </div>
        <TableFooter shown={visible.length} total={list.length} />
      </Card>

      {open && (
        <CreateInvoice
          customers={customers}
          projects={projects}
          invoice={editing ?? undefined}
          onClose={() => setOpen(false)}
          onSave={async (payload) => {
            try {
              const response = editing
                ? await api.patch(`/invoices/${editing.dbId}`, payload)
                : await api.post("/invoices", payload);
              const saved = fromApi(response.data?.data?.item);
              setList((current) => editing
                ? current.map((item) => item.dbId === editing.dbId ? saved : item)
                : [saved, ...current]);
              setOpen(false);
              setEditing(null);
            } catch (error) {
              const err = error as { userMessage?: string; message?: string };
              setRequestError(err.userMessage || err.message || "Could not save invoice.");
            }
          }}
        />
      )}
      {paymentInvoice && (
        <Modal
          title={`Record payment · ${paymentInvoice.id}`}
          desc={`Outstanding balance: ${inr(Math.max(total(paymentInvoice) - paymentInvoice.paid, 0))}`}
          submitLabel="Save payment"
          disabled={Number(paymentAmount) <= 0 || Number(paymentAmount) > total(paymentInvoice) - paymentInvoice.paid || (paymentMode !== "Cash" && !paymentReference.trim())}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={() => void markPaid()}
        >
          <Field label="Amount received (₹)">
            <input type="number" min="0.01" max={total(paymentInvoice) - paymentInvoice.paid} className={inputCls} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
          </Field>
          <Field label="Payment mode">
            <select className={inputCls} value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
              <option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Cheque</option>
            </select>
          </Field>
          <Field label="Payment date">
            <input type="date" className={inputCls} value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </Field>
          <Field label="UTR / cheque / reference">
            <input className={inputCls} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder={paymentMode === "Cash" ? "Optional for cash" : "Transaction number"} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

/* ---------- dialog ---------- */

function CreateInvoice({ customers, projects, invoice, onClose, onSave }: { customers: Option[]; projects: Option[]; invoice?: Inv; onClose: () => void; onSave: (payload: { customerId: string; projectId: string | null; type: Inv["type"]; issueDate: string; dueDate: string; taxableAmount: number; gstRate: number }) => void }) {
  const [f, setF] = useState({
    customer: invoice?.customerId ?? "",
    project: invoice?.projectId ?? "",
    type: invoice?.type ?? "Tax invoice" as Inv["type"],
    taxable: invoice ? String(invoice.taxable) : "",
    gstRate: invoice ? String(invoice.gstRate) : "5",
    issued: invoice?.issued ?? TODAY,
    due: invoice?.due ?? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v, ...(k === "customer" ? { project: "" } : {}) }));
  const base = Number(f.taxable) || 0;
  const tax = base * (Number(f.gstRate) / 100);

  return (
    <Modal
      title={invoice ? `Edit ${invoice.id}` : "Create invoice"}
      desc={invoice ? "Update this draft invoice." : "The server assigns the invoice number. It will remain a draft until you send it."}
      submitLabel={invoice ? "Save changes" : "Save draft"}
      disabled={!f.customer.trim() || base <= 0}
      onClose={onClose}
      onSubmit={() =>
        onSave({
          customerId: f.customer,
          projectId: f.project || null,
          type: f.type,
          issueDate: f.issued,
          dueDate: f.due,
          taxableAmount: base,
          gstRate: Number(f.gstRate),
        })
      }
    >
      <Field label="Customer" wide>
        <select className={inputCls} value={f.customer} onChange={(e) => set("customer", e.target.value)} autoFocus>
          <option value="">Select a customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="Project" wide>
        <select className={inputCls} value={f.project} onChange={(e) => set("project", e.target.value)}>
          <option value="">No linked project</option>
          {projects.filter((project) => !project.customerId || project.customerId === f.customer).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </Field>
      <Field label="Invoice type">
        <select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>
          <option>Tax invoice</option>
          <option>Proforma</option>
        </select>
      </Field>
      <Field label="Taxable amount (₹)">
        <input type="number" min="0" className={inputCls} value={f.taxable} onChange={(e) => set("taxable", e.target.value)} />
      </Field>
      <Field label="GST rate">
        <select className={inputCls} value={f.gstRate} onChange={(e) => set("gstRate", e.target.value)}>
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18">18%</option>
        </select>
      </Field>
      <Field label="Issue date">
        <input type="date" className={inputCls} value={f.issued} onChange={(e) => set("issued", e.target.value)} />
      </Field>
      <Field label="Due date">
        <input type="date" className={inputCls} value={f.due} onChange={(e) => set("due", e.target.value)} />
      </Field>
      <div className="rounded-xl bg-slate-50 p-4 text-sm sm:col-span-2">
        <div className="flex justify-between text-slate-500">
          <span>GST ({f.gstRate}%)</span>
          <span className="tabular-nums">{inr(tax)}</span>
        </div>
        <div className="mt-2 flex justify-between font-semibold text-slate-900">
          <span>Invoice total</span>
          <span className="tabular-nums">{inr(base + tax)}</span>
        </div>
      </div>
    </Modal>
  );
}
