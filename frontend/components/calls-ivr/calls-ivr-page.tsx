"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CallDashboard from "@/components/calls-ivr/sections/call-dashboard";
import CallLogs from "@/components/calls-ivr/sections/call-logs";
import IvrConfiguration from "@/components/calls-ivr/sections/ivr-configuration";
import MissedCallFollowUps from "@/components/calls-ivr/sections/missed-call-follow-ups";
import CallToLeadMapping from "@/components/calls-ivr/sections/call-to-lead-mapping";
import IvrSettings from "@/components/calls-ivr/sections/ivr-settings";

const sections = [
  { id: "dashboard", label: "Call Dashboard" },
  { id: "logs", label: "Call Logs" },
  { id: "ivr", label: "IVR Configuration" },
  { id: "follow-ups", label: "Missed Call Follow-ups" },
  { id: "mapping", label: "Call-to-Lead Mapping" },
  { id: "settings", label: "IVR Settings" },
];

export default function CallsIvrPage({ section = "dashboard" }: { section?: string }) {
  const current = sections.find((item) => item.id === section) || sections[0];
  return <div className="space-y-3"><div className="flex items-center gap-2 px-1 text-sm text-muted-foreground"><span>Sales & CRM</span><ChevronRight size={14} /><span className="font-semibold text-slate-900">Calls & IVR</span><ChevronRight size={14} /><span>{current.label}</span></div><nav aria-label="Calls and IVR pages" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">{sections.map((item) => { const active = item.id === section; return <Link key={item.id} href={item.id === "dashboard" ? "/calls-ivr" : `/calls-ivr/${item.id}`} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item.label}</Link>; })}</nav>{section === "dashboard" && <CallDashboard />}{section === "logs" && <CallLogs />}{section === "ivr" && <IvrConfiguration />}{section === "follow-ups" && <MissedCallFollowUps />}{section === "mapping" && <CallToLeadMapping />}{section === "settings" && <IvrSettings />}</div>;
}
