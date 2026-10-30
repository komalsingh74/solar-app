"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const darkBtn = "h-10 rounded-xl bg-slate-950 px-4 text-white shadow-sm hover:bg-slate-800";
export const outBtn = "h-10 rounded-xl border-slate-200 px-4";
export const thCls = "h-12 px-4 text-sm font-semibold text-muted-foreground";
export const pillList = "h-10 rounded-full border-0 bg-slate-100 p-1";
export const pillTrig = "rounded-full border-0 px-4 text-sm text-slate-600 shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm";

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export const fmtDate = (s: string) => (s ? new Date(s + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
export const dayLabel = (s: string) => (!s ? "—" : s === d(0) ? "Today" : s === d(1) ? "Tomorrow" : s === d(-1) ? "Yesterday" : fmtDate(s));

export function SideSheet({ open, onOpenChange, title, description, error, saveLabel, busy = false, onSave, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string;
  error?: string; saveLabel: string; busy?: boolean; onSave: () => void; children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 !max-w-2xl">
        <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left">
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
        <SheetFooter className="flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          {error && <span className="text-sm text-muted-foreground sm:mr-auto">{error}</span>}
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className={`${outBtn} flex-1 sm:flex-none`} disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="lg" className={`${darkBtn} flex-1 sm:flex-none`} disabled={Boolean(error) || busy} onClick={onSave}>{busy ? "Saving..." : saveLabel}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DetailDialog({ open, onOpenChange, title, description, footer, children, wide, plainHeader = false }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; footer: ReactNode; children: ReactNode; wide?: boolean; plainHeader?: boolean;
}) {
  const initials = title.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-0 ${wide ? "sm:max-w-2xl" : "sm:max-w-xl"}`}>
        {plainHeader ? (
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader className="shrink-0 flex-row items-center gap-2.5 rounded-xl bg-slate-50/70 p-2.5 pr-10">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">{initials || "D"}</span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold text-slate-900">{title}</DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-slate-500">{description}</DialogDescription>
            </div>
          </DialogHeader>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">{children}</div>
        <DialogFooter className="-mx-4 -mb-4 shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
