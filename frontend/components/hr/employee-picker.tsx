"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type EmployeeOption = {
  id: string;
  name: string;
  code: string;
  designation: string;
  department?: string;
  role?: string;
};

type Props = {
  label: string;
  value: string;
  options: EmployeeOption[];
  onChange: (id: string) => void;
  includeUnassigned?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fallbackName?: string;
  fallbackSecondary?: string;
};

export default function EmployeePicker({
  label,
  value,
  options,
  onChange,
  includeUnassigned = false,
  placeholder = "Select employee",
  disabled = false,
  className = "",
  fallbackName = "",
  fallbackSecondary = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((employee) => employee.id === value);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? options.filter((employee) => `${employee.name} ${employee.code} ${employee.designation} ${employee.department ?? ""} ${employee.role ?? ""}`.toLowerCase().includes(query))
      : options;
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={root} className={`relative grid gap-1.5 ${className}`}>
      <label className="text-sm font-semibold text-slate-800">{label}</label>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left disabled:opacity-50"
      >
        {selected || (value && fallbackName) ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{selected?.name ?? fallbackName}</span>
            <span className="block truncate text-xs text-slate-500">{selected ? `${selected.code}${selected.designation ? ` · ${selected.designation}` : ""}` : fallbackSecondary}</span>
          </span>
        ) : (
          <span className="text-sm text-slate-500">{includeUnassigned && !value ? "Unassigned" : placeholder}</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or employee code" className="h-9 rounded-lg pl-8" />
          </div>
          <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto p-1">
            {includeUnassigned && (
              <li>
                <button type="button" role="option" aria-selected={!value} onClick={() => choose("")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                  Unassigned
                </button>
              </li>
            )}
            {visible.map((employee) => (
              <li key={employee.id}>
                <button type="button" role="option" aria-selected={value === employee.id} onClick={() => choose(employee.id)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{employee.name}</span>
                    <span className="block truncate text-xs text-slate-500">{employee.code}{employee.designation ? ` · ${employee.designation}` : ""}</span>
                  </span>
                  {value === employee.id && <Check size={16} className="shrink-0 text-indigo-600" />}
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-5 text-center text-sm text-slate-500">No active employees found.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
