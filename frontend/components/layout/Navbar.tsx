"use client";

import { Bell, Search, Menu, ChevronDown, LogOut, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const destinations = [
  ["Dashboard", "/dashboard"], ["Leads", "/leads"], ["Follow-ups / My Tasks", "/follow-ups-my-task"],
  ["Quotations", "/quotations"], ["Customers", "/customers"], ["Site Surveys", "/site-survey"],
  ["Solar Projects", "/projects"], ["Inventory & Stock", "/inventory-stock"],
  ["Purchase", "/purchase"], ["Invoices", "/invoices"], ["Payments & Outstanding", "/payment-outstanding"],
  ["Payment Plans & Finance", "/payment-plan-finance"],
  ["Employees", "/employees"], ["Attendance & Leave", "/attendance"], ["Service & Complaints", "/service"],
  ["Reports & Analytics", "/reports"], ["Settings", "/settings"],
];

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const results = useMemo(() => destinations.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query]);
  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    router.push("/login");
  };
  const go = (href: string) => { router.push(href); setQuery(""); setSearchOpen(false); setNotificationsOpen(false); setProfileOpen(false); };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="relative hidden w-full max-w-xl sm:block">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search leads, customers, projects..."
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); if (event.key === "Enter" && results[0]) go(results[0][1]); }}
            aria-label="Search pages"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            ⌘ K
          </kbd>
        </div>
        {searchOpen && query.trim() && <div className="absolute left-16 top-[62px] z-50 hidden w-[min(32rem,calc(100vw-8rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl sm:block">{results.length ? results.map(([label, href]) => <button key={href} type="button" onClick={() => go(href)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">{label}</button>) : <p className="px-3 py-2 text-sm text-slate-500">No matching pages</p>}</div>}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Bell size={21} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
        </button>
        {notificationsOpen && <div className="absolute right-20 top-16 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Notifications</h2><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16} /></button></div><div className="mt-3 space-y-2"><button type="button" onClick={() => go("/follow-ups-my-task")} className="w-full rounded-xl bg-amber-50 p-3 text-left"><span className="block text-sm font-medium text-slate-800">3 follow-ups need attention</span><span className="text-xs text-slate-500">Review today's tasks</span></button><button type="button" onClick={() => go("/payment-outstanding")} className="w-full rounded-xl bg-indigo-50 p-3 text-left"><span className="block text-sm font-medium text-slate-800">Outstanding payments</span><span className="text-xs text-slate-500">Open receivables</span></button></div></div>}

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <button
          type="button"
          onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}
          aria-expanded={profileOpen}
          className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            VS
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-semibold text-slate-900">
              Vanshika Solar
            </p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
          <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
        </button>
        {profileOpen && <div className="absolute right-4 top-16 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button type="button" onClick={() => go("/settings")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Settings size={16} /> Settings</button><button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Sign out</button></div>}
      </div>
    </header>
  );
}
