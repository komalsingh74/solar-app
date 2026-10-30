"use client";

import { Avatar, Chip, KV, PageHeader, Panel, StatCard, StatusBadge, Tone, AreaField, SelectField, TextField, tabCls, tabsListCls } from "@/components/ui/page-layout";
import { DetailDialog, SideSheet, d, darkBtn, dayLabel, outBtn, thCls } from "@/components/master/module-kit";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarCheck, CalendarClock, Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Download, Eye, FileText, MapPin, MapPinOff, Pencil, Phone, Plus, Search, Sun, Trash2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";

const STATUSES = ["Scheduled", "Completed", "Rescheduled", "Cancelled"];
const ROOFS = ["RCC", "Metal Sheet", "Tiled", "Asbestos", "Ground Mount", "Other"];
const SHADOWS = ["None", "Partial", "Heavy"];
const PHASES = ["Single phase", "Three phase"];
const CHECKS = [
  "Roof structure can bear panel load",
  "Safe roof access available",
  "Earthing point available",
  "Meter and DB location noted",
  "Inverter space identified",
  "Cable route planned",
];
const MAX_PHOTOS = 12;
const PAGE_SIZE = 6;
const TARIFF = 8; // Rs per unit, used only for the savings estimate
const statusTone: Record<string, Tone> = { Scheduled: "indigo", "In Progress": "amber", Completed: "green", Rescheduled: "amber", Cancelled: "red" };
const verdictTone: Record<string, Tone> = { Feasible: "green", "Reduced size": "amber", "Not feasible": "red", Pending: "slate" };
const isActive = (status: string) => status === "Scheduled" || status === "Rescheduled";

/* ---------- Types ---------- */

// source: "exif" = GPS was inside the photo, "device" = taken with camera and phone location was used, "none" = no GPS
type Photo = { id: string; name: string; src: string; lat: number | null; lng: number | null; source: "exif" | "device" | "none"; addedAt: string };
type LogItem = { at: string; text: string };

type Survey = {
  id: string; customerId: string; engineerId: string; code: string; customer: string; phone: string; address: string; date: string; time: string; engineer: string; status: string;
  cancelReason: string; roofType: string; roofArea: string; shadow: string; load: string; phase: string; units: string; notes: string;
  checklist: Record<string, boolean>; photos: Photo[]; log: LogItem[];
};

const logEntry = (text: string): LogItem => ({ at: new Date().toISOString(), text });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const blank = (): Survey => ({
  id: "", customerId: "", engineerId: "", code: "", customer: "", phone: "", address: "", date: d(1), time: "11:00", engineer: "", status: "Scheduled", cancelReason: "",
  roofType: "RCC", roofArea: "", shadow: "None", load: "", phase: "Single phase", units: "", notes: "", checklist: {}, photos: [], log: [],
});

/* ---------- Photo helpers ---------- */

// Reads GPS latitude/longitude from a JPEG's EXIF data. Returns null if the photo has no GPS.
function readExifGps(buf: ArrayBuffer): { lat: number; lng: number } | null {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) return null;
      const len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10; // start of TIFF header
        const little = v.getUint16(t) === 0x4949;
        const u16 = (o: number) => v.getUint16(t + o, little);
        const u32 = (o: number) => v.getUint32(t + o, little);
        const readIfd = (ifd: number) => {
          const out: Record<number, number> = {};
          const n = u16(ifd);
          for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; out[u16(e)] = e; }
          return out;
        };
        const ifd0 = readIfd(u32(4));
        if (!ifd0[0x8825]) return null;
        const gps = readIfd(u32(ifd0[0x8825] + 8));
        if (!gps[2] || !gps[4]) return null;
        const dms = (e: number) => {
          const p = u32(e + 8);
          const r = (k: number) => u32(p + k * 8) / (u32(p + k * 8 + 4) || 1);
          return r(0) + r(1) / 60 + r(2) / 3600;
        };
        const ref = (e: number) => String.fromCharCode(v.getUint8(t + e + 8));
        let lat = dms(gps[2]), lng = dms(gps[4]);
        if (gps[1] && ref(gps[1]) === "S") lat = -lat;
        if (gps[3] && ref(gps[3]) === "W") lng = -lng;
        if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
        return { lat, lng };
      }
      off += 2 + len;
    }
  } catch { /* ignore broken EXIF */ }
  return null;
}

const deviceLocation = () =>
  new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

// Shrinks big phone photos (max 1280px) so the page stays fast.
const compress = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot read image")); };
    img.src = url;
  });

const mapsUrl = (p: Photo) => `https://www.google.com/maps?q=${p.lat},${p.lng}`;
const coords = (p: Photo) => `${p.lat!.toFixed(5)}, ${p.lng!.toFixed(5)}`;

function GpsBadge({ p }: { p: Photo }) {
  return p.lat !== null && p.lng !== null ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><MapPin size={12} />GPS</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"><MapPinOff size={12} />No GPS</span>
  );
}

/* ---------- Photo gallery: preview + (optional) upload ---------- */

function PhotoGallery({ photos, onChange, editable = false }: { photos: Photo[]; onChange?: (p: Photo[]) => void; editable?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const cur = photos[Math.min(idx, photos.length - 1)];
  const curIdx = photos.indexOf(cur);

  const addFiles = async (files: FileList | null, fromCamera: boolean) => {
    if (!files?.length || !onChange) return;
    setBusy(true);
    setMsg("");
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/"));
    let here: { lat: number; lng: number } | null | undefined; // phone location, fetched once per batch
    const added: Photo[] = [];
    for (const f of picked.slice(0, room)) {
      try {
        let loc = readExifGps(await f.arrayBuffer());
        let source: Photo["source"] = loc ? "exif" : "none";
        // Camera photos often lose GPS in the browser, so use the phone's current location for them.
        if (!loc && fromCamera) {
          if (here === undefined) here = await deviceLocation();
          if (here) { loc = here; source = "device"; }
        }
        added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: f.name, src: await compress(f), lat: loc?.lat ?? null, lng: loc?.lng ?? null, source, addedAt: new Date().toISOString() });
      } catch { /* skip unreadable file */ }
    }
    if (added.length) { onChange([...photos, ...added]); setIdx(photos.length); }
    const notes: string[] = [];
    if (picked.length > room) notes.push(`Only ${MAX_PHOTOS} photos allowed per survey.`);
    if (picked.length < files.length) notes.push("Non-image files were skipped.");
    if (added.some((p) => p.source === "none")) notes.push("Some photos have no GPS. Use the Take photo button on site, or turn on location tags in your camera app.");
    setMsg(notes.join(" "));
    setBusy(false);
  };

  const remove = (id: string) => {
    onChange?.(photos.filter((p) => p.id !== id));
    setIdx((i) => Math.max(0, i - 1));
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl border-slate-200 bg-white" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => camRef.current?.click()}><Camera size={16} /> Take photo</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl border-slate-200 bg-white" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => galRef.current?.click()}><Upload size={16} /> Choose files</Button>
            <span className="self-center text-sm text-muted-foreground">{busy ? "Adding photos…" : `${photos.length} / ${MAX_PHOTOS} photos`}</span>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, true); e.target.value = ""; }} />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, false); e.target.value = ""; }} />
          {msg && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800"><AlertCircle className="mr-2 inline" size={14} />{msg}</div>}
        </div>
      )}

      {cur ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.name} className="mx-auto h-[220px] w-full object-contain sm:h-[340px]" />
            {photos.length > 1 && (
              <>
                <Button type="button" variant="secondary" size="icon" aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg" onClick={() => setIdx((curIdx - 1 + photos.length) % photos.length)}><ChevronLeft /></Button>
                <Button type="button" variant="secondary" size="icon" aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg" onClick={() => setIdx((curIdx + 1) % photos.length)}><ChevronRight /></Button>
              </>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{curIdx + 1} / {photos.length}</span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <GpsBadge p={cur} />
              {cur.lat !== null ? (
                <a href={mapsUrl(cur)} target="_blank" rel="noreferrer" className="text-indigo-700 underline-offset-2 hover:underline">{coords(cur)} · Open in Maps</a>
              ) : (
                <span className="text-muted-foreground">Location not available</span>
              )}
            </div>
            <span className="text-muted-foreground">{cur.source === "device" ? "Phone location at capture" : cur.source === "exif" ? "From photo data" : ""}</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <div key={p.id} className="relative shrink-0">
                <button type="button" aria-label={`Show photo ${i + 1}`} onClick={() => setIdx(i)} className={`block overflow-hidden rounded-xl border-2 transition ${i === curIdx ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent opacity-80 hover:opacity-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.name} className="h-[68px] w-[84px] object-cover" />
                </button>
                {p.lat !== null && <MapPin size={14} className="absolute bottom-1 left-1 text-emerald-400 drop-shadow" />}
                {editable && (
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(p.id)} className="absolute -right-1 -top-1 rounded-full bg-white p-1.5 text-red-600 shadow ring-1 ring-slate-200"><Trash2 size={12} /></button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
          <span className="mb-2 text-sm font-semibold text-slate-700">{editable ? "Your gallery is ready" : "No site photos yet"}</span>
          <span className="max-w-xs text-xs leading-relaxed text-slate-500">{editable ? "Take a photo on site or choose images to document the roof and surroundings." : "Photos added during the site survey will appear here."}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Business rules ---------- */

type Option = { id: string; name: string; phone?: string; address?: string };
const fromApi = (record: Record<string, unknown>): Survey => {
  const customer = record.customer && typeof record.customer === "object" ? record.customer as Record<string, unknown> : null;
  const engineer = record.engineer && typeof record.engineer === "object" ? record.engineer as Record<string, unknown> : null;
  const address = customer?.installationAddress && typeof customer.installationAddress === "object" ? customer.installationAddress as Record<string, unknown> : null;
  const checklist = record.checklist && typeof record.checklist === "object" ? record.checklist as Record<string, boolean> : {};
  const photos = Array.isArray(record.photos) ? record.photos as Photo[] : [];
  const activity = Array.isArray(record.activity) ? record.activity as Record<string, unknown>[] : [];
  return {
    ...blank(),
    id: String(record._id ?? ""), customerId: String(customer?._id ?? record.customer ?? ""),
    engineerId: String(engineer?._id ?? record.engineer ?? ""), code: String(record.surveyNumber ?? ""),
    customer: String(customer?.customerName ?? ""), phone: String(record.phone ?? customer?.phone ?? ""),
    address: String(record.siteAddress ?? [address?.address, address?.city].filter(Boolean).join(", ")),
    date: record.visitDate ? new Date(String(record.visitDate)).toISOString().slice(0, 10) : "",
    time: String(record.visitTime ?? "11:00"), engineer: String(engineer?.name ?? ""),
    status: String(record.status ?? "Scheduled"), cancelReason: String(record.cancelReason ?? ""),
    roofType: String(record.roofType ?? "RCC"), roofArea: record.shadowFreeAreaSqFt == null ? "" : String(record.shadowFreeAreaSqFt),
    shadow: String(record.shadowOnRoof ?? "None"), load: record.sanctionedLoadKw == null ? "" : String(record.sanctionedLoadKw),
    phase: String(record.connection ?? "Single phase"), units: record.averageMonthlyUnitsKwh == null ? "" : String(record.averageMonthlyUnitsKwh),
    notes: String(record.siteNotes ?? ""), checklist, photos,
    log: activity.map((entry) => ({ at: String(entry.at ?? ""), text: String(entry.text ?? "") })),
  };
};

// ~120 units per kW per month, ~100 sq ft roof per kW
const assess = (s: Survey) => {
  const u = Number(s.units), a = Number(s.roofArea);
  if (!u || !a) return { kw: 0, need: 0, max: 0, verdict: "Pending", gen: 0, saving: 0 };
  const kw = Math.max(1, Math.ceil(u / 120)), need = kw * 100, max = Math.floor(a / 100);
  const verdict = s.shadow === "Heavy" ? "Not feasible" : a >= need ? "Feasible" : a >= need * 0.5 ? "Reduced size" : "Not feasible";
  const factor = s.shadow === "Heavy" ? 0.6 : s.shadow === "Partial" ? 0.85 : 1;
  const sized = verdict === "Reduced size" ? Math.max(max, 1) : kw;
  const gen = Math.round(sized * 120 * factor);
  const saving = Math.round(Math.min(u, gen) * TARIFF);
  return { kw, need, max, verdict, gen, saving };
};

const validPhone = (p: string) => {
  const digits = p.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
};

// Things that must be filled before a survey can be marked Completed.
const completionIssues = (s: Survey) => {
  const out: string[] = [];
  if (!Number(s.roofArea)) out.push("shadow-free roof area");
  if (!Number(s.units)) out.push("average monthly units");
  if (s.photos.length === 0) out.push("at least 1 site photo");
  return out.length ? `To complete this survey, add: ${out.join(", ")}.` : "";
};

const conflictFor = (all: Survey[], id: string, engineerId: string, date: string, time: string) =>
  all.find((x) => x.id !== id && isActive(x.status) && x.engineerId === engineerId && x.date === date && x.time === time);

const isOverdue = (s: Survey) => isActive(s.status) && s.date < d(0);

function Assessment({ s }: { s: Survey }) {
  const a = assess(s);
  const hint = s.shadow === "Heavy" ? "Heavy shadow cuts generation. Check for a shadow-free area before quoting."
    : a.verdict === "Reduced size" ? `Roof fits only about ${a.max} kW. Quote a smaller system.`
    : a.verdict === "Not feasible" ? "Roof is too small for this load." : "";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Auto assessment</p><StatusBadge tone={verdictTone[a.verdict]}>{a.verdict}</StatusBadge></div>
      {a.kw ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-muted-foreground">Recommended</p><p className="text-lg font-bold">{a.kw} kW</p></div>
            <div><p className="text-muted-foreground">Area needed</p><p className="text-lg font-bold">{a.need} sq ft</p></div>
            <div><p className="text-muted-foreground">Roof can take</p><p className="text-lg font-bold">{a.max} kW</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm">
            <div><p className="text-muted-foreground">Est. generation</p><p className="font-semibold">{a.gen} units / month</p></div>
            <div><p className="text-muted-foreground">Est. bill saving</p><p className="font-semibold">₹{a.saving.toLocaleString("en-IN")} / month</p></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Estimate only: 120 units per kW per month, ₹{TARIFF} per unit, reduced for shadow.</p>
        </>
      ) : <p className="mt-2 text-sm text-muted-foreground">Enter roof area and monthly units to get a recommendation.</p>}
      {hint && <p className="mt-3 text-sm text-amber-700">{hint}</p>}
    </div>
  );
}

/* ---------- Export helpers ---------- */

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function buildReport(s: Survey) {
  const a = assess(s);
  const row = (k: string, v: string) => `<tr><td class="k">${esc(k)}</td><td>${esc(v || "—")}</td></tr>`;
  const photos = s.photos.map((p) => `<figure><img src="${p.src}" alt="" /><figcaption>${p.lat !== null ? `GPS ${p.lat.toFixed(5)}, ${p.lng!.toFixed(5)}` : "No GPS"}</figcaption></figure>`).join("");
  const checks = CHECKS.map((c) => `<li>${s.checklist[c] ? "&#9745;" : "&#9744;"} ${esc(c)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.code)} Site survey report</title>
<style>body{font-family:system-ui,Arial,sans-serif;color:#0f172a;margin:32px;max-width:860px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:13px}td{padding:6px 8px;border-bottom:1px solid #f1f5f9}td.k{width:200px;color:#64748b}ul{list-style:none;padding:0;font-size:13px;columns:2}
.verdict{display:inline-block;padding:2px 10px;border-radius:999px;background:#f1f5f9;font-size:12px;font-weight:600}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
figure{margin:0}img{width:100%;height:140px;object-fit:cover;border-radius:6px}figcaption{font-size:10px;color:#64748b;margin-top:2px}.muted{color:#64748b;font-size:12px}</style></head><body>
<h1>Site survey report</h1><p class="muted">${esc(s.code)} · Generated ${esc(new Date().toLocaleDateString("en-IN"))}</p>
<h2>Customer and visit</h2><table>${row("Customer", s.customer)}${row("Phone", s.phone)}${row("Site address", s.address)}${row("Visit", `${dayLabel(s.date)}, ${s.time}`)}${row("Engineer", s.engineer)}${row("Status", s.status)}</table>
<h2>Roof and electrical</h2><table>${row("Roof type", s.roofType)}${row("Shadow-free area", s.roofArea ? `${s.roofArea} sq ft` : "")}${row("Shadow", s.shadow)}${row("Sanctioned load", s.load ? `${s.load} kW` : "")}${row("Connection", s.phase)}${row("Average monthly units", s.units ? `${s.units} kWh` : "")}</table>
<h2>Feasibility</h2><p><span class="verdict">${esc(a.verdict)}</span></p>
${a.kw ? `<table>${row("Recommended system", `${a.kw} kW`)}${row("Roof area needed", `${a.need} sq ft`)}${row("Roof can take", `${a.max} kW`)}${row("Est. generation", `${a.gen} units / month`)}${row("Est. bill saving", `Rs ${a.saving.toLocaleString("en-IN")} / month`)}</table><p class="muted">Estimate only. Final design depends on a detailed engineering review.</p>` : `<p class="muted">Roof area and monthly units are not recorded yet.</p>`}
<h2>Site checklist</h2><ul>${checks}</ul>
<h2>Notes</h2><p style="font-size:13px">${esc(s.notes || "No notes.")}</p>
${photos ? `<h2>Site photos (${s.photos.length})</h2><div class="grid">${photos}</div>` : ""}
</body></html>`;
}

/* ---------- Page ---------- */

type ActKind = "complete" | "reschedule" | "cancel" | "delete";
const ACT_TITLE: Record<ActKind, string> = { complete: "Mark survey completed", reschedule: "Reschedule survey", cancel: "Cancel survey", delete: "Delete survey" };

export default function SiteSurveysPage() {
  const [list, setList] = useState<Survey[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [engineers, setEngineers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [engineer, setEngineer] = useState("all");
  const [sort, setSort] = useState("newest");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Survey>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [act, setAct] = useState<{ kind: ActKind; id: string } | null>(null);
  const [actDate, setActDate] = useState("");
  const [actTime, setActTime] = useState("");
  const [actReason, setActReason] = useState("");
  const [toast, setToast] = useState("");
  const view = list.find((s) => s.id === viewId);
  const actTarget = act ? list.find((s) => s.id === act.id) : undefined;

  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const [surveyResponse, optionsResponse] = await Promise.all([
      api.get("/site-surveys", { params: { page: 1, limit: 100 } }),
      api.get("/site-surveys/options"),
    ]);
    const records = surveyResponse.data?.data?.items;
    if (!Array.isArray(records)) throw new Error("The server returned an invalid survey list.");
    const pages = Number(surveyResponse.data?.data?.pagination?.pages) || 1;
    const morePages = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      api.get("/site-surveys", { params: { page: index + 2, limit: 100 } })
    ));
    const allRecords = [...records, ...morePages.flatMap((response) => {
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("The server returned an invalid survey list.");
      return items;
    })];
    setList(allRecords.map((record: Record<string, unknown>) => fromApi(record)));
    const options = optionsResponse.data?.data;
    setCustomers((options?.customers ?? []).map((customer: Record<string, unknown>) => {
      const address = customer.installationAddress && typeof customer.installationAddress === "object" ? customer.installationAddress as Record<string, unknown> : {};
      return { id: String(customer._id), name: String(customer.customerName), phone: String(customer.phone ?? ""), address: [address.address, address.city].filter(Boolean).join(", ") };
    }));
    setEngineers((options?.engineers ?? []).map((person: Record<string, unknown>) => ({ id: String(person._id), name: String(person.name) })));
    setRequestError("");
  };

  useEffect(() => {
    let active = true;
    load().catch((error: { userMessage?: string; message?: string }) => {
      if (active) setRequestError(error.userMessage || error.message || "Could not load site surveys.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const today = d(0);
  const counts = useMemo(() => ({
    all: list.length,
    today: list.filter((s) => isActive(s.status) && s.date === today).length,
    upcoming: list.filter((s) => isActive(s.status) && s.date > today).length,
    overdue: list.filter(isOverdue).length,
    done: list.filter((s) => s.status === "Completed").length,
  }), [list, today]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = list.filter((s) => {
      if (tab === "today" && !(isActive(s.status) && s.date === today)) return false;
      if (tab === "upcoming" && !(isActive(s.status) && s.date > today)) return false;
      if (tab === "overdue" && !isOverdue(s)) return false;
      if (tab === "done" && s.status !== "Completed") return false;
      if (status !== "all" && s.status !== status) return false;
      if (engineer !== "all" && s.engineerId !== engineer) return false;
      return !term || `${s.code} ${s.customer} ${s.phone} ${s.address}`.toLowerCase().includes(term);
    });
    out.sort((a, b) => sort === "name" ? a.customer.localeCompare(b.customer) : sort === "oldest" ? `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) : `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    return out;
  }, [list, q, status, engineer, sort, tab, today]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageNo = Math.min(page, pages);
  const pageRows = rows.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const set = (k: keyof Survey) => (v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const openForm = (s: Survey) => { setDraft({ ...s }); setFormOpen(true); };

  const error = (() => {
    if (!draft.customerId || !draft.customer.trim() || !draft.phone.trim()) return "Select a customer with a valid phone number.";
    if (!draft.engineerId) return "Select an active engineer.";
    if (!validPhone(draft.phone)) return "Enter a valid 10-digit phone number.";
    if (!draft.date || !draft.time) return "Pick a visit date and time.";
    if (!draft.id && draft.date < today) return "Visit date cannot be in the past.";
    if ([draft.roofArea, draft.load, draft.units].some((n) => n !== "" && (!isFinite(Number(n)) || Number(n) < 0))) return "Area, load and units must be positive numbers.";
    if (draft.status === "Cancelled" && !draft.cancelReason.trim()) return "Add a cancellation reason.";
    if (draft.status === "Completed") { const m = completionIssues(draft); if (m) return m; }
    if (isActive(draft.status)) {
      const c = conflictFor(list, draft.id, draft.engineerId, draft.date, draft.time);
      if (c) return `${draft.engineer} already has a visit with ${c.customer} at ${c.time} on ${dayLabel(c.date)}. Pick another time or engineer.`;
    }
    return "";
  })();

  const save = async () => {
    if (error) return;
    setSaving(true);
    setRequestError("");
    try {
      const payload = {
        customerId: draft.customerId, engineerId: draft.engineerId, phone: draft.phone.trim(),
        siteAddress: draft.address.trim(), date: draft.date, time: draft.time, status: draft.status,
        cancelReason: draft.cancelReason, roofType: draft.roofType, shadowFreeAreaSqFt: draft.roofArea === "" ? null : Number(draft.roofArea),
        shadowOnRoof: draft.shadow, sanctionedLoadKw: draft.load === "" ? null : Number(draft.load),
        connection: draft.phase, averageMonthlyUnitsKwh: draft.units === "" ? null : Number(draft.units),
        siteNotes: draft.notes, checklist: draft.checklist, photos: draft.photos,
      };
      const response = draft.id
        ? await api.patch(`/site-surveys/${draft.id}`, payload)
        : await api.post("/site-surveys", payload);
      const saved = fromApi(response.data?.data?.item);
      setList((current) => draft.id
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setFormOpen(false);
      notify(draft.id ? "Survey updated" : `Survey ${saved.code} scheduled`);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not save survey.");
    } finally { setSaving(false); }
  };

  /* ----- Quick actions (complete / reschedule / cancel / delete) ----- */

  const openAct = (kind: ActKind, s: Survey) => {
    setViewId(null);
    setAct({ kind, id: s.id });
    setActDate(s.date >= today ? s.date : d(1));
    setActTime(s.time);
    setActReason("");
  };

  const actError = (() => {
    if (!act || !actTarget) return "";
    if (act.kind === "complete") return completionIssues(actTarget);
    if (act.kind === "cancel") return actReason.trim() ? "" : "Add a cancellation reason.";
    if (act.kind === "reschedule") {
      if (!actDate || !actTime) return "Pick a new date and time.";
      if (actDate < today) return "New date cannot be in the past.";
      const c = conflictFor(list, actTarget.id, actTarget.engineerId, actDate, actTime);
      if (c) return `${actTarget.engineer} already has a visit with ${c.customer} at that time.`;
      return actReason.trim() ? "" : "Add a reason for rescheduling.";
    }
    return "";
  })();

  const confirmAct = async () => {
    if (!act || !actTarget || actError) return;
    setRequestError("");
    try {
      if (act.kind === "delete") {
        await api.delete(`/site-surveys/${act.id}`);
        setList((all) => all.filter((item) => item.id !== act.id));
        notify("Survey deleted");
      } else {
        const payload = act.kind === "complete"
          ? { status: "Completed" }
          : act.kind === "cancel"
            ? { status: "Cancelled", cancelReason: actReason.trim() }
            : { status: "Rescheduled", date: actDate, time: actTime };
        const response = await api.patch(`/site-surveys/${act.id}`, payload);
        const saved = fromApi(response.data?.data?.item);
        setList((all) => all.map((item) => item.id === saved.id ? saved : item));
        notify(act.kind === "complete" ? "Survey completed" : act.kind === "cancel" ? "Survey cancelled" : "Survey rescheduled");
      }
      setAct(null);
    } catch (error) {
      const err = error as { userMessage?: string; message?: string };
      setRequestError(err.userMessage || err.message || "Could not update survey.");
    }
  };

  /* ----- Export ----- */

  const exportCsv = () => {
    const head = ["Survey ID", "Customer", "Phone", "Address", "Date", "Time", "Engineer", "Status", "Roof type", "Roof area (sq ft)", "Shadow", "Load (kW)", "Connection", "Monthly units", "Recommended kW", "Result", "Photos", "Photos with GPS", "Notes"];
    const body = rows.map((s) => {
      const a = assess(s);
      return [s.code, s.customer, s.phone, s.address, s.date, s.time, s.engineer, s.status, s.roofType, s.roofArea, s.shadow, s.load, s.phase, s.units, a.kw || "", a.verdict, s.photos.length, s.photos.filter((p) => p.lat !== null).length, s.notes].map(csvCell).join(",");
    });
    const blob = new Blob(["\ufeff" + [head.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `site-surveys-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${rows.length} surveys`);
  };

  const openReport = (s: Survey) => {
    const w = window.open("", "_blank");
    if (!w) return notify("Allow pop-ups to open the report.");
    w.document.write(buildReport(s));
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 500);
  };

  const checklistDone = (s: Survey) => CHECKS.filter((c) => s.checklist[c]).length;

  return (
    <div className="!space-y-2">
      <PageHeader title="Site surveys" subtitle="Schedule visits, record roof and electrical details, add GPS photos, and get a feasibility result.">
        <Button size="lg" variant="outline" className={outBtn} onClick={exportCsv} disabled={rows.length === 0}><Download /> Export CSV</Button>
        <Button size="lg" className={darkBtn} onClick={() => openForm(blank())}><Plus /> Schedule survey</Button>
      </PageHeader>

      {requestError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
      {loading && <Panel className="p-5 text-sm text-muted-foreground">Loading site surveys…</Panel>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck size={24} />} value={counts.today} label="Visits today" />
        <StatCard icon={<AlertCircle size={24} />} value={counts.overdue} label="Overdue visits" />
        <StatCard icon={<CheckCircle2 size={24} />} value={counts.done} label="Surveys completed" />
        <StatCard icon={<Sun size={24} />} value={list.filter((s) => s.status === "Completed" && assess(s).verdict === "Feasible").length} label="Feasible sites" />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto px-4 pt-4">
          <Tabs value={tab} onValueChange={resetPage(setTab)}>
            <TabsList className={`${tabsListCls} mb-0 min-w-[620px] grid-cols-5`}>
              <TabsTrigger value="all" className={tabCls}>All ({counts.all})</TabsTrigger>
              <TabsTrigger value="today" className={tabCls}>Today ({counts.today})</TabsTrigger>
              <TabsTrigger value="upcoming" className={tabCls}>Upcoming ({counts.upcoming})</TabsTrigger>
              <TabsTrigger value="overdue" className={tabCls}>Overdue ({counts.overdue})</TabsTrigger>
              <TabsTrigger value="done" className={tabCls}>Completed ({counts.done})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder="Search by ID, customer, phone or address" aria-label="Search surveys" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11" />
          </div>
          <Select value={status} onValueChange={resetPage(setStatus)}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={engineer} onValueChange={resetPage(setEngineer)}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-slate-50" aria-label="Filter by engineer"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All engineers</SelectItem>{engineers.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-slate-50" aria-label="Sort surveys"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Visit: newest first</SelectItem>
              <SelectItem value="oldest">Visit: oldest first</SelectItem>
              <SelectItem value="name">Customer A to Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>{["Survey", "Visit", "Engineer", "Roof", "Photos", "Recommended", "Result", "Status"].map((h) => <TableHead key={h} className={thCls}>{h}</TableHead>)}<TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((s) => {
              const a = assess(s);
              const geoCount = s.photos.filter((p) => p.lat !== null).length;
              return (
                <TableRow key={s.id}>
                  <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.customer} /><div><p className="font-semibold">{s.customer}</p><p className="text-sm text-muted-foreground">{s.code} · {s.phone}</p></div></div></TableCell>
                  <TableCell className="px-4">
                    <p className={`font-medium ${s.date === today && isActive(s.status) ? "text-indigo-600" : ""}`}>{dayLabel(s.date)}</p>
                    <p className="text-sm text-muted-foreground">{s.time}</p>
                    {isOverdue(s) && <span className="mt-0.5 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Overdue</span>}
                  </TableCell>
                  <TableCell className="px-4">{s.engineer}</TableCell>
                  <TableCell className="px-4">{s.roofArea ? <div><p>{s.roofType}</p><p className="text-sm text-muted-foreground">{s.roofArea} sq ft</p></div> : "—"}</TableCell>
                  <TableCell className="px-4">{s.photos.length ? <div><p>{s.photos.length} photo{s.photos.length > 1 ? "s" : ""}</p><p className="text-sm text-muted-foreground">{geoCount} with GPS</p></div> : "—"}</TableCell>
                  <TableCell className="px-4">{a.kw ? <Chip>{a.kw} kW</Chip> : "—"}</TableCell>
                  <TableCell className="px-4"><StatusBadge tone={verdictTone[a.verdict]}>{a.verdict}</StatusBadge></TableCell>
                  <TableCell className="px-4"><StatusBadge tone={statusTone[s.status]}>{s.status}</StatusBadge></TableCell>
                  <TableCell className="whitespace-nowrap px-4 text-right">
                    <Button variant="ghost" size="icon" aria-label={`View ${s.customer}`} onClick={() => setViewId(s.id)}><Eye /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${s.customer}`} onClick={() => openForm(s)}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${s.customer}`} className="text-red-600 hover:text-red-700" onClick={() => openAct("delete", s)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-14 text-center text-muted-foreground">No surveys match. Change the filter or schedule a new survey.</TableCell></TableRow>}
          </TableBody>
        </Table>
        {rows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-muted-foreground">
            <span>Showing {(pageNo - 1) * PAGE_SIZE + 1}–{Math.min(pageNo * PAGE_SIZE, rows.length)} of {rows.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" disabled={pageNo <= 1} onClick={() => setPage(pageNo - 1)}><ChevronLeft size={16} /> Previous</Button>
              <span>Page {pageNo} of {pages}</span>
              <Button variant="outline" size="sm" className="rounded-lg" disabled={pageNo >= pages} onClick={() => setPage(pageNo + 1)}>Next <ChevronRight size={16} /></Button>
            </div>
          </div>
        )}
      </Panel>

      <SideSheet open={formOpen} onOpenChange={setFormOpen} title={draft.id ? `Edit survey ${draft.code}` : "Schedule survey"} description="Fill the visit, roof, electrical and photo details." error={error} saveLabel={saving ? "Saving…" : "Save survey"} onSave={save}>
        <Tabs defaultValue="visit">
          <TabsList className={`${tabsListCls} grid-cols-4`}>
            <TabsTrigger value="visit" className={tabCls}>Visit</TabsTrigger>
            <TabsTrigger value="roof" className={tabCls}>Roof & site</TabsTrigger>
            <TabsTrigger value="elec" className={tabCls}>Electrical</TabsTrigger>
            <TabsTrigger value="photos" className={tabCls}>Photos{draft.photos.length ? ` (${draft.photos.length})` : ""}</TabsTrigger>
          </TabsList>
          <TabsContent value="visit" className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-800">Customer</label>
              <Select value={draft.customerId} onValueChange={(id) => {
                const customer = customers.find((entry) => entry.id === id);
                setDraft((current) => ({ ...current, customerId: id ?? "", customer: customer?.name ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" }));
              }}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <TextField label="Phone" type="tel" value={draft.phone} onChange={set("phone")} placeholder="10-digit mobile number" />
            <div className="grid gap-2"><label className="text-sm font-semibold text-slate-800">Engineer</label><Select value={draft.engineerId} onValueChange={(id) => { const person = engineers.find((entry) => entry.id === id); setDraft((current) => ({ ...current, engineerId: id ?? "", engineer: person?.name ?? "" })); }}><SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Select engineer" /></SelectTrigger><SelectContent>{engineers.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select></div>
            <TextField className="sm:col-span-2" label="Site address" value={draft.address} onChange={set("address")} placeholder="House no, area, city" />
            <TextField label="Visit date" type="date" value={draft.date} onChange={set("date")} />
            <TextField label="Time" type="time" value={draft.time} onChange={set("time")} />
            {!!draft.id && <SelectField className="sm:col-span-2" label="Status" value={draft.status} onChange={set("status")} options={STATUSES} />}
            {draft.status === "Cancelled" && <TextField className="sm:col-span-2" label="Cancellation reason" value={draft.cancelReason} onChange={set("cancelReason")} placeholder="Why was this survey cancelled?" />}
          </TabsContent>
          <TabsContent value="roof" className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Roof type" value={draft.roofType} onChange={set("roofType")} options={ROOFS} />
            <TextField label="Shadow-free area (sq ft)" type="number" min={0} value={draft.roofArea} onChange={set("roofArea")} />
            <SelectField className="sm:col-span-2" label="Shadow on roof" value={draft.shadow} onChange={set("shadow")} options={SHADOWS} />
            <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ClipboardCheck size={16} /> Site checklist ({checklistDone(draft)}/{CHECKS.length})</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHECKS.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={!!draft.checklist[c]} onChange={(e) => setDraft((s) => ({ ...s, checklist: { ...s.checklist, [c]: e.target.checked } }))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><AreaField label="Site notes" rows={4} value={draft.notes} onChange={set("notes")} placeholder="Water tank, parapet height, access, structure condition…" /></div>
          </TabsContent>
          <TabsContent value="elec" className="grid gap-4 sm:grid-cols-2">
            <TextField label="Sanctioned load (kW)" type="number" min={0} value={draft.load} onChange={set("load")} />
            <SelectField label="Connection" value={draft.phase} onChange={set("phase")} options={PHASES} />
            <TextField className="sm:col-span-2" label="Average monthly units (kWh)" type="number" min={0} value={draft.units} onChange={set("units")} placeholder="Check the last 6 bills" />
            <Assessment s={draft} />
          </TabsContent>
          <TabsContent value="photos">
            <PhotoGallery editable photos={draft.photos} onChange={(photos) => setDraft((s) => ({ ...s, photos }))} />
          </TabsContent>
        </Tabs>
      </SideSheet>

      {view && (
        <DetailDialog open onOpenChange={() => setViewId(null)} title={view.customer} description={`${view.code} · ${view.address} · ${dayLabel(view.date)}, ${view.time}`}
          footer={<div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setViewId(null)}>Close</Button>
            <Button variant="outline" size="lg" className={outBtn} onClick={() => openReport(view)}><FileText /> Report</Button>
            {isActive(view.status) && <Button variant="outline" size="lg" className={outBtn} onClick={() => openAct("reschedule", view)}><CalendarClock /> Reschedule</Button>}
            {isActive(view.status) && <Button variant="outline" size="lg" className={outBtn} onClick={() => openAct("cancel", view)}><XCircle /> Cancel</Button>}
            {isActive(view.status) && <Button size="lg" className={darkBtn} onClick={() => openAct("complete", view)}><CheckCircle2 /> Mark completed</Button>}
            <Button size="lg" className={darkBtn} onClick={() => { setViewId(null); openForm(view); }}><Pencil /> Edit survey</Button>
          </div>}>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <KV label="Phone"><a href={`tel:${view.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-indigo-700"><Phone size={15} />{view.phone}</a></KV>
              <KV label="Status"><StatusBadge tone={statusTone[view.status]}>{view.status}</StatusBadge></KV>
              <KV label="Engineer">{view.engineer}</KV>
              <KV label="Roof">{view.roofType}{view.roofArea ? ` · ${view.roofArea} sq ft` : ""}</KV>
              <KV label="Shadow">{view.shadow}</KV>
              <KV label="Connection">{view.phase}{view.load ? ` · ${view.load} kW` : ""}</KV>
              {view.status === "Cancelled" && <KV label="Cancellation reason">{view.cancelReason || "—"}</KV>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><Assessment s={view} /></div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Site checklist ({checklistDone(view)}/{CHECKS.length})</p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {CHECKS.map((c) => <li key={c} className={view.checklist[c] ? "text-emerald-700" : "text-muted-foreground"}>{view.checklist[c] ? "✓" : "○"} {c}</li>)}
              </ul>
            </div>
            <div><p className="mb-1.5 text-sm font-semibold">Site photos ({view.photos.length})</p><PhotoGallery photos={view.photos} /></div>
            <div><p className="mb-1.5 text-sm font-semibold">Notes</p><p className="text-muted-foreground">{view.notes || "No notes yet."}</p></div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Activity</p>
              <ul className="space-y-1.5 text-sm">
                {view.log.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
                {view.log.map((l, i) => <li key={i} className="flex gap-3"><span className="w-28 shrink-0 text-muted-foreground">{fmtTime(l.at)}</span><span>{l.text}</span></li>)}
              </ul>
            </div>
          </div>
        </DetailDialog>
      )}

      {act && actTarget && (
        <DetailDialog open onOpenChange={(o) => { if (!o) setAct(null); }} title={ACT_TITLE[act.kind]} description={`${actTarget.code} · ${actTarget.customer}`}
          footer={<div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="lg" className={outBtn} onClick={() => setAct(null)}>Keep survey</Button>
            <Button size="lg" className={act.kind === "delete" || act.kind === "cancel" ? "bg-red-600 text-white hover:bg-red-700" : darkBtn} disabled={!!actError} onClick={confirmAct}>
              {act.kind === "complete" ? "Mark completed" : act.kind === "reschedule" ? "Reschedule" : act.kind === "cancel" ? "Cancel survey" : "Delete survey"}
            </Button>
          </div>}>
          <div className="space-y-4">
            {act.kind === "delete" && <p className="text-sm text-muted-foreground">This permanently removes the survey, its photos and its activity history. This cannot be undone. If the visit will not happen, cancel it instead so the record stays.</p>}
            {act.kind === "complete" && !actError && <p className="text-sm text-muted-foreground">Roof details, monthly units and site photos are recorded. The survey will move to Completed and count toward feasible sites.</p>}
            {act.kind === "reschedule" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="New date" type="date" value={actDate} onChange={setActDate} />
                <TextField label="New time" type="time" value={actTime} onChange={setActTime} />
              </div>
            )}
            {(act.kind === "reschedule" || act.kind === "cancel") && <AreaField label={act.kind === "cancel" ? "Cancellation reason" : "Reason for rescheduling"} rows={3} value={actReason} onChange={setActReason} placeholder={act.kind === "cancel" ? "Customer not interested, wrong address…" : "Customer unavailable, rain, engineer on leave…"} />}
            {actError && <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertCircle className="mr-2 inline" size={14} />{actError}</div>}
          </div>
        </DetailDialog>
      )}

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
