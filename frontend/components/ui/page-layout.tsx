"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type Tone = "green" | "red" | "amber" | "indigo" | "slate";
const tones: Record<Tone, string> = {
  green: "border-transparent bg-emerald-50 text-emerald-700",
  red: "border-transparent bg-rose-50 text-rose-700",
  amber: "border-transparent bg-amber-50 text-amber-700",
  indigo: "border-transparent bg-indigo-50 text-indigo-700",
  slate: "border-transparent bg-slate-100 text-slate-700",
};

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return <header className="mb-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3"><div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>{subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}</div>{children && <div className="flex flex-wrap gap-3">{children}</div>}</header>;
}
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white text-card-foreground shadow-none ${className}`}>{children}</section>;
}
export function StatCard({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return <Panel className="flex min-h-[96px] items-center gap-4 p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span><div className="min-w-0"><p className="truncate text-xl font-bold tracking-tight">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></Panel>;
}
export function StatusBadge({ tone = "slate", className, children }: { tone?: Tone; className?: string; children: ReactNode }) { return <Badge variant="outline" className={cn(tones[tone], className)}>{children}</Badge>; }
export function Chip({ children, className }: { children: ReactNode; className?: string }) { return <Badge variant="secondary" className={cn("bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-50", className)}>{children}</Badge>; }
export function Avatar({ name, className }: { name: string; className?: string }) { const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); return <span className={cn("grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white", className)}>{initials}</span>; }
export function KV({ label, children }: { label: string; children: ReactNode }) { return <div data-slot="detail-kv" className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"><p className="text-[11px] font-medium text-slate-400">{label}</p><p className="mt-0.5 break-words text-xs font-semibold text-slate-800">{children}</p></div>; }
export const tabsListCls = "mb-6 grid h-10 w-full grid-cols-3 rounded-full border-0 bg-slate-100 p-1";
export const tabCls = "rounded-full border-0 text-sm text-slate-600 shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm";

type FieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & { label: string; value: string | number; onChange: (value: string) => void; className?: string };
export function TextField({ label, value, onChange, className, id, ...props }: FieldProps) { const generated = useId(); const fieldId = id ?? props.name ?? generated; return <div className={`grid gap-2 ${className ?? ""}`}><Label className="font-semibold text-slate-800" htmlFor={fieldId}>{label}</Label><Input id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm shadow-none" {...props} /></div>; }
type AreaProps = Omit<ComponentProps<"textarea">, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; className?: string };
export function AreaField({ label, value, onChange, className, id, ...props }: AreaProps) { const generated = useId(); const fieldId = id ?? props.name ?? generated; return <div className={`grid gap-2 ${className ?? ""}`}><Label className="font-semibold text-slate-800" htmlFor={fieldId}>{label}</Label><Textarea id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border-slate-200 bg-white shadow-none" {...props} /></div>; }
export function SelectField({ label, value, onChange, options, placeholder = "Select an option", className }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder?: string; className?: string }) { const id = useId(); return <div className={`grid gap-2 ${className ?? ""}`}><Label className="font-semibold text-slate-800" htmlFor={id}>{label}</Label><Select value={value || null} onValueChange={(next) => onChange(next ?? "")}><SelectTrigger id={id} className="h-12 w-full rounded-xl border-slate-200 bg-white px-4 text-sm shadow-none"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>; }
export function FormSheet({ open, onOpenChange, title, description, footer, children, wide = false }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; footer?: ReactNode; children: ReactNode; wide?: boolean }) { return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className={`flex w-full gap-0 overflow-hidden border-l border-slate-200 bg-white p-0 !max-w-2xl ${wide ? "!max-w-5xl" : ""}`}><SheetHeader className="shrink-0 border-b border-slate-200 px-4 py-3 text-left pr-14"><SheetTitle className="text-xl font-bold">{title}</SheetTitle>{description && <SheetDescription>{description}</SheetDescription>}</SheetHeader><div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{children}</div>{footer && <SheetFooter className="shrink-0 flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">{footer}</SheetFooter>}</SheetContent></Sheet>; }
export function ViewDialog({ open, onOpenChange, title, description, footer, children, size = "sm:max-w-xl" }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; footer?: ReactNode; children: ReactNode; size?: string }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-0 ${size}`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="text-lg font-semibold">{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader><div className="min-h-0 flex-1 overflow-y-auto py-1">{children}</div>{footer && <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-end">{footer}</DialogFooter>}</DialogContent></Dialog>; }







