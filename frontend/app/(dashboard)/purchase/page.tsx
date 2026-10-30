"use client";

import { useEffect, useState } from "react";
import { Plus, ShoppingCart, Truck, Banknote, CircleCheck, PackageX, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
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
  TODAY,
  fmtDate,
  inputCls,
  inr,
  type Tone,
} from "@/components/erp/erp-ui";
import api from "@/lib/api";
import { getAllPages } from "@/lib/api-pagination";

// Purchase flow: PO → Goods received (GRN) → Vendor bill → Paid
const stages = ["Draft", "Ordered", "Received", "Billed", "Paid"];
const stageTone: Tone[] = ["slate", "sky", "indigo", "amber", "emerald"];
const nextAction = ["Send order", "Mark received", "Add vendor bill", "Mark paid"];

type Option = { id: string; name: string; price?: number };
type POLine = { itemId: string; quantity: number; rate: number };
type PO = { id: string; number: string; supplierId: string; supplier: string; warehouseId: string; items: string; lines: POLine[]; ordered: string; expected: string; amount: number; stage: number };
const fromApi = (record: Record<string, unknown>): PO => {
  const supplier = record.supplier && typeof record.supplier === "object" ? record.supplier as Record<string, unknown> : null;
  const warehouse = record.warehouse && typeof record.warehouse === "object" ? record.warehouse as Record<string, unknown> : null;
  const lines = Array.isArray(record.items) ? record.items as Record<string, unknown>[] : [];
  return {
    id: String(record._id ?? ""), number: String(record.orderNumber ?? ""), supplierId: String(supplier?._id ?? record.supplier ?? ""),
    supplier: String(supplier?.supplierName ?? ""), warehouseId: String(warehouse?._id ?? record.warehouse ?? ""),
    items: lines.map((line) => `${String(line.itemName ?? "")} × ${String(line.quantity ?? 0)}`).join(", "),
    lines: lines.map((line) => {
      const item = line.item && typeof line.item === "object" ? line.item as Record<string, unknown> : null;
      return { itemId: String(item?._id ?? line.item ?? ""), quantity: Number(line.quantity ?? 0), rate: Number(line.rate ?? 0) };
    }),
    ordered: record.orderedAt ? String(record.orderedAt).slice(0, 10) : "",
    expected: record.expectedAt ? String(record.expectedAt).slice(0, 10) : "",
    amount: Number(record.amount ?? 0), stage: stages.indexOf(String(record.stage ?? "Draft")),
  };
};

/* ---------- page ---------- */

export default function PurchasePage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [items, setItems] = useState<Option[]>([]);
  const [lowStock, setLowStock] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<null | { item: string; order?: PO }>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  const load = async () => {
    const [records, optionsResponse, stockItems] = await Promise.all([
      getAllPages<Record<string, unknown>>("/purchase-orders"),
      api.get("/purchase-orders/options"),
      getAllPages<Record<string, unknown>>("/inventory/stock"),
    ]);
    setOrders(records.map((record) => fromApi(record)));
    const options = optionsResponse.data?.data;
    setSuppliers((options?.suppliers ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.supplierName) })));
    setWarehouses((options?.warehouses ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.locationName) })));
    setItems((options?.items ?? []).map((item: Record<string, unknown>) => ({ id: String(item._id), name: String(item.itemName), price: Number(item.unitPrice ?? 0) })));
    setLowStock(stockItems.filter((item: Record<string, unknown>) => {
      const balances = Array.isArray(item.stock) ? item.stock as Record<string, unknown>[] : [];
      const onHand = balances.reduce((sum, balance) => sum + Number(balance.quantity ?? 0), 0);
      return onHand <= Number(item.minimumStock ?? 0);
    }).map((item: Record<string, unknown>) => {
      const balances = Array.isArray(item.stock) ? item.stock as Record<string, unknown>[] : [];
      const onHand = balances.reduce((sum, balance) => sum + Number(balance.quantity ?? 0), 0);
      return `${String(item.itemName)} (${onHand} left)`;
    }));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => { if (active) setRequestError(error.userMessage || error.message || "Could not load purchase orders."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sum = (fn: (o: PO) => boolean) => orders.filter(fn).reduce((s, o) => s + o.amount, 0);
  const openCount = orders.filter((o) => o.stage <= 1).length;
  const awaiting = sum((o) => o.stage === 1);
  const toPay = sum((o) => o.stage === 2 || o.stage === 3);
  const paid = sum((o) => o.stage === 4);

  const isLate = (o: PO) => o.stage === 1 && o.expected < TODAY;

  const visible = orders.filter((o) => {
    if (stageFilter !== "all" && o.stage !== stageFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || [o.number, o.supplier, o.items].some((v) => v.toLowerCase().includes(q));
  });

  const advance = async (order: PO) => {
    const nextStage = stages[order.stage + 1];
    if (!nextStage) return;
    try {
      const response = await api.post(`/purchase-orders/${order.id}/advance`, { stage: nextStage });
      const saved = fromApi(response.data?.data?.item);
      setOrders((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (nextStage === "Received") void load();
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not advance purchase order.");
    }
  };
  const remove = async (order: PO) => {
    if (!window.confirm(`Delete draft ${order.number}?`)) return;
    try {
      await api.delete(`/purchase-orders/${order.id}`);
      setOrders((current) => current.filter((entry) => entry.id !== order.id));
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not delete purchase order.");
    }
  };
  const saveOrder = async (payload: { supplierId: string; warehouseId: string; expectedAt: string; items: POLine[] }, order?: PO) => {
    try {
      const response = order
        ? await api.patch(`/purchase-orders/${order.id}`, payload)
        : await api.post("/purchase-orders", payload);
      const saved = fromApi(response.data?.data?.item);
      setOrders((current) => order
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setDialog(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save purchase order.");
    }
  };

  return (
    <div className="min-w-0 !space-y-2">
      <PageHeader
        eyebrow="Project operations"
        title="Purchase"
        desc="Order material, receive it into stock, record the vendor bill and pay the supplier."
        actions={
          <Btn variant="primary" icon={Plus} onClick={() => setDialog({ item: "" })}>
            New purchase order
          </Btn>
        }
      />

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Card className="p-5 text-sm text-slate-500">Loading purchase orders…</Card>}
      {lowStock.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <PackageX size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{lowStock.length} items are below reorder level</p>
              <p className="mt-0.5 text-sm text-slate-600">{lowStock.join(" · ")}</p>
            </div>
          </div>
          <Btn size="sm" onClick={() => {
            const name = lowStock[0].replace(/\s*\(.*\)/, "");
            setDialog({ item: items.find((item) => item.name === name)?.id ?? "" });
          }}>
            Create order
          </Btn>
        </div>
      )}

      <StatGrid>
        <StatCard dark label="Open orders" value={String(openCount)} sub="Draft or waiting for delivery" icon={ShoppingCart} />
        <StatCard label="Awaiting delivery" value={inr(awaiting)} sub="Ordered, not yet received" icon={Truck} tint="bg-indigo-50 text-indigo-600" />
        <StatCard label="Bills to pay" value={inr(toPay)} sub="Received or billed, unpaid" icon={Banknote} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Paid to suppliers" value={inr(paid)} sub="Completed orders" icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" />
      </StatGrid>

      {/* Flow tracker */}
      <Card className="p-4">
        <SectionTitle title="Purchase flow" sub="Click a step to filter orders" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {stages.map((s, i) => {
            const count = orders.filter((o) => o.stage === i).length;
            const active = stageFilter === i;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(active ? "all" : i)}
                className={`relative rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active ? "border-indigo-200 bg-indigo-50/70 ring-1 ring-indigo-100" : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                }`}
              >
                <p className={`text-2xl font-bold tabular-nums ${active ? "text-indigo-700" : "text-slate-900"}`}>{count}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s}</p>
                {i < stages.length - 1 && (
                  <ChevronRight size={16} className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white text-slate-300 md:block" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <TableToolbar>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Purchase orders</h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search order, supplier, item..." />
        </TableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 sm:px-6">Order</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Expected</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Stage</th>
                <th className="px-5 py-3 text-right sm:px-6">Next step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((o) => (
                <tr key={o.id} className="transition hover:bg-slate-50/60">
                  <td className="px-5 py-4 sm:px-6">
                    <p className="font-semibold text-slate-900">{o.number}</p>
                    <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500">{o.items}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-700">{o.supplier}</td>
                  <td className="px-3 py-4">
                    <p className="text-slate-700">{fmtDate(o.expected)}</p>
                    {isLate(o) && <p className="mt-0.5 text-xs font-medium text-red-600">Delayed</p>}
                  </td>
                  <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900">{inr(o.amount)}</td>
                  <td className="px-3 py-4">
                    <Chip tone={stageTone[o.stage]}>{stages[o.stage]}</Chip>
                  </td>
                  <td className="px-5 py-4 text-right sm:px-6">
                    {o.stage === 0 && <button type="button" className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label={`Edit ${o.number}`} onClick={() => setDialog({ item: "", order: o })}><Pencil size={15} /></button>}
                    {o.stage < 4 ? (
                      <Btn size="sm" variant={o.stage === 1 ? "primary" : "secondary"} onClick={() => void advance(o)}>
                        {nextAction[o.stage]}
                      </Btn>
                    ) : (
                      <span className="text-xs text-slate-400">Completed</span>
                    )}
                    {o.stage === 0 && <button type="button" className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${o.number}`} onClick={() => void remove(o)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <EmptyState icon={ShoppingCart} title="No orders found" text="Change the filter or create a new purchase order." />}
        </div>
        <TableFooter shown={visible.length} total={orders.length} />
      </Card>

      {dialog && (
        <NewOrder
          initialItem={dialog.item}
          order={dialog.order}
          suppliers={suppliers}
          items={items}
          warehouses={warehouses}
          onClose={() => setDialog(null)}
          onSave={(payload) => saveOrder(payload, dialog.order)}
        />
      )}
    </div>
  );
}

/* ---------- dialog ---------- */

function NewOrder({
  initialItem,
  order,
  suppliers,
  items,
  warehouses,
  onClose,
  onSave,
}: {
  initialItem: string;
  order?: PO;
  suppliers: Option[];
  items: Option[];
  warehouses: Option[];
  onClose: () => void;
  onSave: (payload: { supplierId: string; warehouseId: string; expectedAt: string; items: POLine[] }) => void;
}) {
  const [f, setF] = useState({
    supplier: order?.supplierId ?? suppliers[0]?.id ?? "",
    warehouse: order?.warehouseId ?? warehouses[0]?.id ?? "",
    expected: order?.expected ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  const [lines, setLines] = useState<POLine[]>(order?.lines.length
    ? order.lines.map((line) => ({ ...line }))
    : [{ itemId: initialItem, quantity: 1, rate: items.find((item) => item.id === initialItem)?.price ?? 0 }]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const amount = lines.reduce((total, line) => total + line.quantity * line.rate, 0);
  const validLines = lines.length > 0 && lines.every((line) => line.itemId && line.quantity > 0 && line.rate >= 0);
  const updateLine = (index: number, patch: Partial<POLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));

  return (
    <Modal
      title={order ? `Edit ${order.number}` : "New purchase order"}
      desc={order ? "Update this draft order before sending it." : "The server assigns the order number. The order stays a draft until sent."}
      submitLabel={order ? "Update order" : "Save order"}
      disabled={!f.supplier || !f.warehouse || !validLines || amount < 0 || !f.expected}
      onClose={onClose}
      onSubmit={() => onSave({
        supplierId: f.supplier,
        warehouseId: f.warehouse,
        expectedAt: f.expected,
        items: lines,
      })}
    >
      <Field label="Supplier" wide>
        <select className={inputCls} value={f.supplier} onChange={(e) => set("supplier", e.target.value)}>
          <option value="">Select supplier</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </Field>
      <Field label="Receive into" wide>
        <select className={inputCls} value={f.warehouse} onChange={(e) => set("warehouse", e.target.value)}>
          <option value="">Select warehouse</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
      </Field>
      {lines.map((line, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-2">
          <Field label={`Item ${index + 1}`} wide>
            <select className={inputCls} value={line.itemId} onChange={(e) => updateLine(index, { itemId: e.target.value, rate: items.find((item) => item.id === e.target.value)?.price ?? 0 })}>
              <option value="">Select item</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input type="number" min="0.001" step="any" className={inputCls} value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Rate per unit (₹)">
            <input type="number" min="0" step="any" className={inputCls} value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} />
          </Field>
          {lines.length > 1 && <button type="button" className="justify-self-start text-sm text-red-600" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove item</button>}
        </div>
      ))}
      <button type="button" className="text-sm font-semibold text-indigo-600 sm:col-span-2" onClick={() => setLines((current) => [...current, { itemId: "", quantity: 1, rate: 0 }])}>+ Add item</button>
      <Field label="Expected delivery" wide>
        <input type="date" className={inputCls} value={f.expected} onChange={(e) => set("expected", e.target.value)} />
      </Field>
      <div className="flex justify-between rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-900 sm:col-span-2">
        <span>Order total</span>
        <span className="tabular-nums">{inr(amount)}</span>
      </div>
    </Modal>
  );
}
