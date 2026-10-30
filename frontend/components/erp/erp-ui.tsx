"use client";

/**
 * Shared ERP UI kit, built on shadcn/ui.
 * Same exports as before, so the Subsidy, Invoices, Purchase and AMC pages need NO changes.
 *
 * Install the shadcn components once:
 *   npx shadcn@latest add button card input label dialog tabs progress
 */

import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";
import TableExportActions from "@/components/layout/TableExportActions";
import { Button } from "@/components/ui/button";
import { Card as ShadCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress as ShadProgress } from "@/components/ui/progress";
import { Tabs as ShadTabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ---------- helpers ---------- */

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const TODAY = new Date().toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000);

export const addYears = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};

/** Same look as the shadcn <Input>. Use it on native <select> and <input> inside dialogs. */
export const inputCls =
  "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

/* ---------- layout ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ShadCard
      className={cn("gap-0 rounded-2xl border border-slate-200 bg-white py-0 text-card-foreground shadow-none ring-0", className)}
    >
      {children}
    </ShadCard>
  );
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{eyebrow}</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- button (shadcn Button) ---------- */

export function Btn({
  children,
  icon: Icon,
  variant = "secondary",
  size = "md",
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "dark";
  size?: "md" | "sm";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const sizes = size === "sm" ? "h-auto rounded-lg px-2.5 py-1.5 text-xs" : "h-auto rounded-xl px-4 py-2.5 text-sm";
  const look = {
    primary: "bg-slate-950 font-semibold text-white shadow-sm hover:bg-slate-800",
    dark: "bg-slate-950 font-semibold text-white shadow-sm hover:bg-slate-800",
    secondary: "border-slate-200 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  }[variant];

  return (
    <Button
      type={type}
      variant={variant === "secondary" ? "outline" : "default"}
      onClick={onClick}
      disabled={disabled}
      className={cn(sizes, look, "focus-visible:ring-indigo-500/40", className)}
    >
      {Icon && <Icon size={size === "sm" ? 13 : 16} />}
      {children}
    </Button>
  );
}

/* ---------- stat card ---------- */

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint = "bg-indigo-50 text-indigo-600",
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tint?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[96px] min-w-0 items-center gap-4 rounded-2xl border p-4",
        "border-slate-200 bg-white text-slate-900"
      )}
    >
      <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl", tint)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <section className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

/* ---------- chip & progress ---------- */

export type Tone = "amber" | "indigo" | "emerald" | "red" | "slate" | "sky";

const chipTone: Record<Tone, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

/** Plain span on purpose: your own <Badge> has a custom `tone` prop, so this avoids clashing with it. */
export function Chip({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        chipTone[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "emerald" | "amber" | "red" }) {
  const indicator = {
    indigo: "[&>div]:bg-indigo-600",
    emerald: "[&>div]:bg-emerald-500",
    amber: "[&>div]:bg-amber-500",
    red: "[&>div]:bg-red-500",
  }[tone];
  return <ShadProgress value={Math.min(100, Math.max(0, value))} className={cn("h-2 bg-slate-100", indicator)} />;
}

/* ---------- tabs (shadcn Tabs) & search (shadcn Input) ---------- */

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <ShadTabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className="h-auto flex-wrap justify-start gap-1.5 bg-transparent p-0">
        {items.map((t) => (
          <TabsTrigger
            key={t.key}
            value={t.key}
            className="flex-none gap-2 rounded-full border-0 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-100 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:bg-slate-950"
          >
            {t.label}
            {t.count !== undefined && <span className="text-xs tabular-nums text-slate-400">{t.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </ShadTabs>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl pl-10 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 sm:w-72"
      />
    </div>
  );
}

/* ---------- table helpers ---------- */

export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
      {children}
      <TableExportActions />
    </div>
  );
}

export function TableFooter({ shown, total }: { shown: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
      <span>
        Showing {shown} of {total}
      </span>
      <span>Sample data. Connect the API to show live records.</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={22} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
      {name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
}

/* ---------- form field (shadcn Label) & modal (shadcn Dialog) ---------- */

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Label className={cn("flex-col items-stretch gap-1 text-sm font-medium text-slate-700", wide && "sm:col-span-2")}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

export function Modal({
  title,
  desc,
  submitLabel,
  disabled,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  desc?: string;
  submitLabel: string;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled) onSubmit();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-xl ring-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-slate-200 px-4 py-2.5 pr-14 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
            <DialogDescription className={desc ? "text-sm text-slate-500" : "sr-only"}>{desc ?? title}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 overflow-y-auto px-4 py-4 sm:grid-cols-2">{children}</div>

          <DialogFooter className="flex-row justify-end !p-6 gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
            <Btn onClick={onClose} className="h-9 px-3 py-2">Cancel</Btn>
            <Btn variant="primary" type="submit" disabled={disabled} className="h-9 px-3 py-2">
              {submitLabel}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
