"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Database,
  LayoutDashboard,
  Users,
  UserRound,
  FileText,
  PanelsTopLeft,
  Package,
  Wallet,
  Headset,
  UsersRound,
  CalendarCheck,
  ChartNoAxesCombined,
  Settings,
  Sun,
  LogOut,
  X,
  PanelLeftClose,
  ClipboardList,
  Bell,
  LayoutDashboardIcon,
  Route,
  PhoneCall,
} from "lucide-react";

const groups = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      // { label: "Customer Journey Demo", href: "/customer-journey", icon: Route },
     
    ],
  },

  {
    title: "Sales & CRM",
    items: [
      { label: "Leads", href: "/leads", icon: Users },
       { label: "Follow-ups / My Tasks", href: "/follow-ups-my-task", icon: CalendarCheck },
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Customers", href: "/customers", icon: UserRound },
      { label: "Calls & IVR", href: "/calls-ivr", icon: PhoneCall },
      // { label: "Partners & Commission", href: "/sales-automation", icon: Users },
    ],
  },
  {
    title: "Project Operations",
    items: [
      { label: "Site Surveys", href: "/site-survey", icon: PanelsTopLeft },
      { label: "Solar Projects", href: "/projects", icon: Sun },
      { label: "Subsidy & Net Metering", href: "/subsidy", icon: FileText },
      { label: "Installation Team", href: "/installation-team", icon: Users },
      { label: "Inventory & Stock Movements", href: "/inventory-stock", icon: Package },
      { label: "Purchase", href: "/purchase", icon: Package },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Payments & Outstanding", href: "/payment-outstanding", icon: Wallet },
      // { label: "Payment Plans & Finance", href: "/payment-plan-finance", icon: Wallet },
      { label: "Expenses", href: "/expenses", icon: Wallet },
    ],
  },
  {
    title: "Team & HR",
    items: [
      { label: "Dashboard", href: "/hr-dashboard", icon: LayoutDashboardIcon },
      { label: "Employees", href: "/employees", icon: UsersRound },
      { label: "Attendance & Leave", href: "/attendance", icon: CalendarCheck },
      { label: "Shifts & Work Schedules", href: "/shifts", icon: CalendarCheck },
      { label: "Payroll", href: "/payroll", icon: Wallet },
      { label: "Salary Structure", href: "/salary-structure", icon: Wallet },
      { label: "Payslips", href: "/payslip", icon: FileText },
      { label: "Advances & Deductions", href: "/advance", icon: Wallet },
      { label: "Statutory & Tax Settings", href: "/statutory", icon: Settings },
      // { label: "HR Setup", href: "/statutory", icon: Settings },
      
    ],
  },
  {
    title: "Service & Support",
    items: [
      { label: "Service & Complaints", href: "/service", icon: Headset },
      { label: "AMC & Warranty", href: "/amc", icon: Settings },
    ],
  },
  {
    title: "Reports & Administration",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: ChartNoAxesCombined },
      // { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Master (ERP + CRM)",
    items: [
      // { label: "Employee Master", href: "/master/employee", icon: UsersRound },
      // { label: "Roles & Permissions", href: "/master/role-permissions", icon: Settings },
      { label: "Customer Master", href: "/master/customer", icon: UserRound },
      { label: "Lead Source Master", href: "/master/lead-source", icon: Users },
      { label: "Product / Item Master", href: "/master/product-item", icon: Package },
      { label: "Supplier Master", href: "/master/supplier", icon: Package },
      { label: "Warehouse Master", href: "/master/warehouse-stock-location", icon: PanelsTopLeft },
      { label: "Expense Categories", href: "/master/expanse-category", icon: Wallet },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Users", href: "/users", icon: Users },
     { label: "Roles & Permissions", href: "/master/role-permissions", icon: Settings },
      // { label: "Audit log", href: "/audit-log", icon: ClipboardList },
      // { label: "Notifications", href: "/settings#notify", icon: Bell },
    ],
  },
];

export default function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [masterOpen, setMasterOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        {/* Brand */}
        <div className={`flex h-[72px] shrink-0 items-center border-b border-slate-100 ${collapsed ? "justify-between px-5 lg:justify-center lg:px-0" : "justify-between px-5"}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "lg:hidden" : ""}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-amber-400">
              <Sun size={22} />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-bold text-slate-900">Vanshika Solar</p>
              <p className="text-xs text-slate-500">ERP + CRM</p>
            </div>
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              aria-expanded={false}
              title="Expand sidebar"
              className="mx-auto hidden h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-amber-400 transition hover:bg-slate-800 lg:flex"
            >
              <Sun size={22} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            aria-expanded="true"
            className={`hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${collapsed ? "" : "lg:block"}`}
          >
            <PanelLeftClose size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className={`flex-1 space-y-1 overflow-y-auto py-2 ${collapsed ? "px-3 lg:px-0" : "px-4"}`}>
          {groups.map((group, groupIndex) => {
            const isMaster = group.title === "Master (ERP + CRM)";
            const isTeamHr = group.title === "Team & HR";
            const isSettings = group.title === "Settings";
            const isDropdown = isMaster || isTeamHr || isSettings;
            const isOpen = isMaster ? masterOpen : isTeamHr ? teamOpen : settingsOpen;
            return (
            <div
              key={`${group.title}-${groupIndex}`}
              className={collapsed && groupIndex > 0 ? "border-t border-slate-100 pt-2" : ""}
            >
              {isDropdown ? (
                <>
                  {isTeamHr && (
                    <p className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>
                      HRMS
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => isMaster ? setMasterOpen((value) => !value) : isTeamHr ? setTeamOpen((value) => !value) : setSettingsOpen((value) => !value)}
                    aria-expanded={isOpen}
                    className={`relative flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      isOpen
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${collapsed ? "gap-2.5 lg:mx-auto lg:w-14 lg:justify-center lg:gap-0 lg:px-0" : "gap-2.5"}`}
                  >
                    {isOpen && <span className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-indigo-500" />}
                    {isMaster ? <Database size={18} className="shrink-0 text-indigo-600" /> : isTeamHr ? <UsersRound size={18} className="shrink-0 text-indigo-600" /> : <Settings size={18} className="shrink-0 text-indigo-600" />}
                    <span className={collapsed ? "lg:hidden" : ""}>{group.title}</span>
                    <span className={`ml-auto ${collapsed ? "lg:hidden" : ""}`}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className={`mt-1 space-y-0.5 border-l border-slate-200 ${collapsed ? "ml-4 pl-2 lg:ml-0 lg:border-0 lg:pl-0" : "ml-5 pl-3"}`}>
                      {group.items.map(({ label, href, icon: Icon }, itemIndex) => {
                        const activeIndex = group.items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
                        const active = itemIndex === activeIndex;
                        return (
                          <Link
                            key={`${label}-${href}`}
                            href={href}
                            onClick={onClose}
                            title={collapsed ? label : undefined}
                            aria-label={collapsed ? label : undefined}
                            className={`flex items-center rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                              collapsed ? "gap-2.5 lg:mx-auto lg:w-14 lg:justify-center lg:gap-0 lg:px-0" : "gap-2.5"
                            } ${
                              active
                                ? "bg-slate-950 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <Icon size={18} className="shrink-0" />
                            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {!groups.slice(0, groupIndex).some((previousGroup) => previousGroup.title === group.title) && (
                    <p className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>
                      {group.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map(({ label, href, icon: Icon }, itemIndex) => {
                      const activeIndex = group.items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
                      const active = itemIndex === activeIndex;
                      return (
                        <Link
                          key={`${label}-${href}`}
                          href={href}
                          onClick={onClose}
                          title={collapsed ? label : undefined}
                          aria-label={collapsed ? label : undefined}
                          className={`flex items-center rounded-xl text-sm font-medium transition ${
                            collapsed
                              ? "gap-2.5 px-3 py-2 lg:mx-auto lg:w-14 lg:justify-center lg:gap-0 lg:px-0"
                              : "gap-2.5 px-3 py-1.5"
                          } ${
                            active
                              ? "bg-slate-950 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ); })}
        </nav>

        {/* User */}
        <div className={`shrink-0 border-t border-slate-100 ${collapsed ? "p-3 lg:p-2" : "p-4"}`}>
          <div className={`flex items-center rounded-xl bg-slate-50 ${collapsed ? "justify-start gap-3 p-3 lg:flex-col lg:justify-center lg:gap-2 lg:p-2" : "gap-3 p-3"}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 ${collapsed ? "lg:mx-auto" : ""}`}>
              SS
            </div>
            <div className={`min-w-0 flex-1 leading-tight ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold text-slate-900">
                Sumit Saxena
              </p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <button
              type="button"
              onClick={() => { localStorage.removeItem("token"); sessionStorage.removeItem("token"); router.push("/login"); }}
              aria-label="Log out"
              title={collapsed ? "Log out" : undefined}
              className={`rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900 ${collapsed ? "lg:hidden" : ""}`}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

