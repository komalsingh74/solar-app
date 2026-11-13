"use client";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/page-layout";
import { Switch } from "@/components/ui/switch";
import Loader from "@/components/common/Loader";

type Data = { webhookUrl: string; virtualNumber: string; lastCallAt: string | null; createLeadForUnknown: boolean };

export default function IvrSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/ivr/settings/status").then((res) => setData(res.data.data))
      .catch((err) => setError(err.userMessage || "Could not load settings."));
  }, []);

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.webhookUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const toggle = async (checked: boolean) => {
    if (!data) return;
    setData({ ...data, createLeadForUnknown: checked });
    try { await api.put("/ivr/mapping", { createLeadForUnknown: checked }); }
    catch (err) { setData({ ...data, createLeadForUnknown: !checked }); setError((err as { userMessage?: string }).userMessage || "Could not save."); }
  };

  return <div className="space-y-4">
    <PageHeader title="Exotel Setup" subtitle="Paste the webhook URL in your Exotel Passthru applet to start receiving calls." />
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {!data ? <Panel className="flex justify-center p-8"><Loader type="inline" text="Loading Exotel settings..." /></Panel> : <>
      <Panel className="p-5">
        <h2 className="font-bold">Webhook URL</h2>
        <p className="text-sm text-muted-foreground">Exotel Passthru applet me ye URL paste karein.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
          <code className="min-w-0 flex-1 break-all text-xs">{data.webhookUrl}</code>
          <Button variant="outline" className="rounded-xl" onClick={copy}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</Button>
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="p-5"><p className="text-sm text-muted-foreground">Virtual number</p><p className="mt-1 text-lg font-bold">{data.virtualNumber || "Not set in .env"}</p></Panel>
        <Panel className="p-5"><p className="text-sm text-muted-foreground">Last call received</p><p className="mt-1 text-lg font-bold">{data.lastCallAt ? new Date(data.lastCallAt).toLocaleString() : "No calls yet"}</p></Panel>
      </div>
      <Panel className="flex items-center justify-between gap-3 p-4">
        <div><p className="font-semibold">Unknown number se lead banao</p><p className="text-sm text-muted-foreground">Naye caller ka lead automatically ban jayega.</p></div>
        <Switch checked={data.createLeadForUnknown} onCheckedChange={toggle} aria-label="Create leads from unknown callers" />
      </Panel>
    </>}
  </div>;
}