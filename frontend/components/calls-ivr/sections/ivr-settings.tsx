"use client";

import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Webhook } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, StatusBadge, type Tone } from "@/components/ui/page-layout";

type Data = {
  companyId: string;
  provider: { configured: boolean; status: string; provider?: string | null; checkedAt: string; message?: string };
  credentials: { configured: boolean; provider?: string | null; accountId?: string | null; healthUrl: string; virtualNumber: string; hasAuthToken: boolean };
  webhook: { configured: boolean; endpoint: string };
};
const toneFor = (status: string): Tone => status === "endpoint_reachable" ? "green" : ["endpoint_error", "unreachable"].includes(status) ? "red" : "amber";
const webhookOrigin = (process.env.NEXT_PUBLIC_API_URL || "https://your-api-host/api").replace(/\/api\/?$/, "");

export default function IvrSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api.get("/ivr/settings/status").then((res) => { if (active) setData(res.data.data); }).catch((err) => { if (active) setError(err.userMessage || "Could not load provider configuration."); });
    return () => { active = false; };
  }, [retry]);

  return <div className="space-y-4">
    <PageHeader title="IVR Settings" subtitle="Company-scoped telephony credentials are encrypted before storage. Live call routing needs a vendor-specific provider adapter." />
    {error && <Panel className="p-4 text-sm text-rose-700"><div role="alert">{error} <button onClick={() => { setError(""); setRetry((n) => n + 1); }} className="font-semibold text-indigo-700">Retry</button></div></Panel>}
    {!data && !error && <Panel className="p-8 text-center text-muted-foreground">Loading provider configuration…</Panel>}
    {data && <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Activity size={20} /></span><div><h2 className="font-bold">Telephony provider</h2><p className="text-sm text-muted-foreground">Server-side credential status</p></div></div><StatusBadge tone={toneFor(data.provider.status)}>{data.provider.status.replaceAll("_", " ")}</StatusBadge></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Provider" value={data.credentials.provider || "Not configured"} /><Info label="Account" value={data.credentials.accountId || "Not configured"} /></div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">{data.provider.message || (data.provider.status === "endpoint_reachable" ? "Configured HTTP health endpoint responded. This generic check does not verify live telephony actions." : data.provider.status === "unverified" ? "Credentials are stored, but no health URL is configured; connectivity is unverified." : data.provider.status === "not_configured" ? "Add the provider credentials below to get started." : "Configured health endpoint did not respond successfully.")}</p>
          <p className="mt-3 text-xs text-muted-foreground">Checked {new Date(data.provider.checkedAt).toLocaleString()}</p>
          <button onClick={() => setRetry((n) => n + 1)} className="mt-3 text-sm font-semibold text-indigo-700">Check provider status again</button>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Webhook size={20} /></span><div><h2 className="font-bold">Inbound webhook</h2><p className="text-sm text-muted-foreground">Signed events create and update call logs.</p></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><code className="break-all text-xs">{webhookOrigin}{data.webhook.endpoint}</code><StatusBadge tone={data.webhook.configured ? "green" : "amber"}>{data.webhook.configured ? "Secret configured" : "Secret missing"}</StatusBadge></div>
          <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>Webhook signing secret is encrypted at rest and never returned to the browser.</p></div>
        </Panel>
      </div>
      <ProviderCredentialsForm key={`${data.companyId}-${retry}`} data={data} onSaved={() => setRetry((n) => n + 1)} />
      <Panel className="p-4"><h2 className="font-bold">Provider adapter</h2><p className="mt-1 text-sm text-muted-foreground">Credential storage and generic health checks are ready. Live IVR deployment, vendor webhook validation and outbound calling need the selected provider’s API adapter.</p></Panel>
    </>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }

function ProviderCredentialsForm({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const [provider, setProvider] = useState(data.credentials.provider || "");
  const [accountId, setAccountId] = useState(data.credentials.accountId || "");
  const [authToken, setAuthToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [healthUrl, setHealthUrl] = useState(data.credentials.healthUrl || "");
  const [virtualNumber, setVirtualNumber] = useState(data.credentials.virtualNumber || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await api.put("/ivr/settings/provider", { provider, accountId, authToken, webhookSecret, healthUrl, virtualNumber });
      setAuthToken(""); setWebhookSecret(""); setMessage("Encrypted credentials saved. Run a provider health check to verify connectivity."); onSaved();
    } catch (err) { setError((err as { userMessage?: string }).userMessage || "Could not save provider credentials."); }
    finally { setSaving(false); }
  };
  return <Panel className="p-5"><div className="mb-4"><h2 className="font-bold">Provider credentials</h2><p className="text-sm text-muted-foreground">Secrets are encrypted with the backend TELEPHONY_ENCRYPTION_KEY. Leave blank secret fields unchanged to keep existing values.</p></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <Field label="Provider name" value={provider} onChange={setProvider} placeholder="Provider name" />
    <Field label="Provider account ID" value={accountId} onChange={setAccountId} placeholder={data.credentials.accountId || "Account ID"} />
    <Field label="API token / secret" value={authToken} onChange={setAuthToken} placeholder={data.credentials.hasAuthToken ? "Saved · enter to rotate" : "Required for new provider"} secret />
    <Field label="Webhook signing secret" value={webhookSecret} onChange={setWebhookSecret} placeholder={data.webhook.configured ? "Saved · enter to rotate" : "Required for new provider"} secret />
    <Field label="Provider health URL" value={healthUrl} onChange={setHealthUrl} placeholder="https://provider.example/health" />
    <Field label="Virtual phone number" value={virtualNumber} onChange={setVirtualNumber} placeholder="+91 …" />
    <div className="sm:col-span-2">{error && <p role="alert" className="mb-2 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="mb-2 text-sm text-emerald-700">{message}</p>}<Button disabled={saving} className="h-10 rounded-xl bg-slate-950 text-white">{saving ? "Saving…" : "Save encrypted credentials"}</Button></div>
  </form></Panel>;
}

function Field({ label, value, onChange, placeholder, secret = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; secret?: boolean }) { return <label className="grid gap-1.5 text-sm font-semibold">{label}<Input type={secret ? "password" : "text"} autoComplete={secret ? "new-password" : "off"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 rounded-xl border-slate-200" /></label>; }
