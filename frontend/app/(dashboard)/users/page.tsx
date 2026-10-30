"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Pencil, Plus, Power, ShieldCheck, UserCheck, UserPlus, UserX, Users, Send } from "lucide-react";
import {
  Avatar,
  Btn,
  Card,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SearchBox,
  StatCard,
  StatGrid,
  TableFooter,
  TableToolbar,
  Tabs,
  TODAY,
  daysBetween,
  fmtDate,
  inputCls,
  type Tone,
} from "@/components/erp/erp-ui";

/* ---------- config & sample data (replace with API) ---------- */

const CURRENT_USER_ID = "U-01"; // logged-in admin

const roles = ["Admin", "Sales", "Accounts", "Installation team"] as const;
type Role = (typeof roles)[number];

const roleTone: Record<Role, Tone> = {
  Admin: "indigo",
  Sales: "sky",
  Accounts: "emerald",
  "Installation team": "amber",
};

// Short summary shown in the dialog. Real access is set in Roles & Permissions.
const roleAccess: Record<Role, string> = {
  Admin: "Full access to every module, settings and users.",
  Sales: "Leads, follow-ups, quotations, customers and site surveys.",
  Accounts: "Invoices, payments, expenses, purchase and reports.",
  "Installation team": "Assigned projects, site surveys, inventory and service tasks.",
};

type UserStatus = "active" | "invited" | "inactive";
type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  lastActive: string; // ISO date or "" when never
  invitedOn?: string;
};

const initial: User[] = [
  { id: "U-01", name: "Sumit Saxena", email: "sumit@vanshikasolar.in", phone: "98370 11001", role: "Admin", status: "active", lastActive: TODAY },
  { id: "U-02", name: "Rohit Sharma", email: "rohit@vanshikasolar.in", phone: "98370 11002", role: "Sales", status: "active", lastActive: TODAY },
  { id: "U-03", name: "Priya Mehta", email: "priya@vanshikasolar.in", phone: "98370 11003", role: "Sales", status: "active", lastActive: "2026-10-19" },
  { id: "U-04", name: "Amit Chauhan", email: "amit@vanshikasolar.in", phone: "98370 11004", role: "Sales", status: "invited", lastActive: "", invitedOn: "2026-10-18" },
  { id: "U-05", name: "Kavita Rao", email: "kavita@vanshikasolar.in", phone: "98370 11005", role: "Sales", status: "inactive", lastActive: "2026-08-02" },
  { id: "U-06", name: "Anita Singh", email: "anita@vanshikasolar.in", phone: "98370 11006", role: "Accounts", status: "active", lastActive: "2026-10-19" },
  { id: "U-07", name: "Manoj Gupta", email: "manoj@vanshikasolar.in", phone: "98370 11007", role: "Accounts", status: "active", lastActive: "2026-10-16" },
  { id: "U-08", name: "Deepak Yadav", email: "deepak@vanshikasolar.in", phone: "98370 11008", role: "Installation team", status: "active", lastActive: TODAY },
  { id: "U-09", name: "Ramesh Kumar", email: "ramesh@vanshikasolar.in", phone: "98370 11009", role: "Installation team", status: "active", lastActive: "2026-10-18" },
  { id: "U-10", name: "Suresh Pal", email: "suresh@vanshikasolar.in", phone: "98370 11010", role: "Installation team", status: "active", lastActive: "2026-10-17" },
  { id: "U-11", name: "Imran Khan", email: "imran@vanshikasolar.in", phone: "98370 11011", role: "Installation team", status: "active", lastActive: "2026-10-14" },
  { id: "U-12", name: "Vijay Singh", email: "vijay@vanshikasolar.in", phone: "98370 11012", role: "Installation team", status: "invited", lastActive: "", invitedOn: "2026-10-20" },
];

const statusTone: Record<UserStatus, Tone> = { active: "emerald", invited: "sky", inactive: "slate" };
const statusLabel: Record<UserStatus, string> = { active: "Active", invited: "Invited", inactive: "Inactive" };

function lastSeen(iso: string) {
  if (!iso) return "Never logged in";
  const n = daysBetween(iso, TODAY);
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 30) return `${n} days ago`;
  return fmtDate(iso);
}

/* ---------- page ---------- */

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initial);
  const [tab, setTab] = useState<"all" | Role>("all");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<null | { user?: User }>(null);

  const count = (s: UserStatus) => users.filter((u) => u.status === s).length;
  const activeAdmins = users.filter((u) => u.role === "Admin" && u.status === "active");
  const isLocked = (u: User) => u.id === CURRENT_USER_ID || (u.role === "Admin" && u.status === "active" && activeAdmins.length <= 1);

  const visible = users.filter((u) => {
    if (tab !== "all" && u.role !== tab) return false;
    if (status !== "all" && u.status !== status) return false;
    const q = query.trim().toLowerCase();
    return !q || [u.name, u.email, u.phone, u.id].some((v) => v.toLowerCase().includes(q));
  });

  const tabs = [
    { key: "all" as const, label: "All", count: users.length },
    ...roles.map((r) => ({ key: r, label: r, count: users.filter((u) => u.role === r).length })),
  ];

  const toggleActive = (id: string) =>
    setUsers((l) => l.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)));
  const resend = (id: string) => setUsers((l) => l.map((u) => (u.id === id ? { ...u, invitedOn: TODAY } : u)));

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Users"
        desc="Add team members, give them a role and control who can log in."
        actions={
          <>
            <Link
              href="/settings/roles"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <ShieldCheck size={16} /> Roles & permissions
            </Link>
            <Btn variant="primary" icon={Plus} onClick={() => setDialog({})}>
              Add user
            </Btn>
          </>
        }
      />

      <StatGrid>
        <StatCard dark label="Total users" value={String(users.length)} sub={`Across ${roles.length} roles`} icon={Users} />
        <StatCard label="Active" value={String(count("active"))} sub="Can log in today" icon={UserCheck} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="Invited" value={String(count("invited"))} sub="Waiting to accept the invite" icon={Mail} tint="bg-sky-50 text-sky-600" />
        <StatCard label="Inactive" value={String(count("inactive"))} sub="Cannot log in" icon={UserX} tint="bg-slate-100 text-slate-600" />
      </StatGrid>

      <Card>
        <TableToolbar>
          <Tabs items={tabs} value={tab} onChange={setTab} />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, phone..." />
            <select value={status} onChange={(e) => setStatus(e.target.value as "all" | UserStatus)} className={`${inputCls} sm:w-40`} aria-label="Filter by status">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </TableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 sm:px-6">User</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Last active</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((u) => {
                const locked = isLocked(u);
                return (
                  <tr key={u.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
                            {u.name}
                            {u.id === CURRENT_USER_ID && <span className="text-xs font-medium text-slate-400">(You)</span>}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <Chip tone={roleTone[u.role]}>{u.role}</Chip>
                    </td>
                    <td className="px-3 py-4 tabular-nums text-slate-600">{u.phone || "-"}</td>
                    <td className="px-3 py-4 text-slate-600">{lastSeen(u.lastActive)}</td>
                    <td className="px-3 py-4">
                      <Chip tone={statusTone[u.status]}>{statusLabel[u.status]}</Chip>
                      {u.status === "invited" && u.invitedOn && (
                        <p className="mt-1 text-xs text-slate-400">Sent {fmtDate(u.invitedOn)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex justify-end gap-1.5">
                        {u.status === "invited" && (
                          <Btn size="sm" icon={Send} onClick={() => resend(u.id)}>
                            Resend
                          </Btn>
                        )}
                        <Btn size="sm" icon={Pencil} onClick={() => setDialog({ user: u })}>
                          Edit
                        </Btn>
                        {u.status !== "invited" && (
                          <Btn size="sm" icon={Power} disabled={locked && u.status === "active"} onClick={() => toggleActive(u.id)}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && <EmptyState icon={Users} title="No users found" text="Change the role, status or search." />}
        </div>
        <TableFooter shown={visible.length} total={users.length} />
      </Card>

      {dialog && (
        <UserDialog
          user={dialog.user}
          locked={dialog.user ? isLocked(dialog.user) : false}
          nextId={`U-${String(13 + users.length - initial.length).padStart(2, "0")}`}
          onClose={() => setDialog(null)}
          onSave={(u) => {
            setUsers((l) => (l.some((x) => x.id === u.id) ? l.map((x) => (x.id === u.id ? u : x)) : [...l, u]));
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- add / edit dialog ---------- */

function UserDialog({
  user,
  locked,
  nextId,
  onClose,
  onSave,
}: {
  user?: User;
  locked: boolean;
  nextId: string;
  onClose: () => void;
  onSave: (u: User) => void;
}) {
  const editing = !!user;
  const [f, setF] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: (user?.role ?? "Sales") as Role,
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email);

  return (
    <Modal
      title={editing ? "Edit user" : "Add user"}
      desc={editing ? `${user!.id} · ${user!.email}` : "An invite will be sent to this email."}
      submitLabel={editing ? "Save changes" : "Send invite"}
      disabled={!valid}
      onClose={onClose}
      onSubmit={() =>
        onSave(
          editing
            ? { ...user!, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), role: f.role }
            : {
                id: nextId,
                name: f.name.trim(),
                email: f.email.trim(),
                phone: f.phone.trim(),
                role: f.role,
                status: "invited",
                lastActive: "",
                invitedOn: TODAY,
              }
        )
      }
    >
      <Field label="Full name" wide>
        <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Verma" autoFocus />
      </Field>
      <Field label="Email">
        <input type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" />
      </Field>
      <Field label="Phone (optional)">
        <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98xxx xxxxx" />
      </Field>
      <Field label="Role" wide>
        <select className={inputCls} value={f.role} disabled={locked} onChange={(e) => set("role", e.target.value)}>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2">
        <p className="font-medium text-slate-900">{f.role} can access</p>
        <p className="mt-1">{roleAccess[f.role]}</p>
        {locked && (
          <p className="mt-2 text-xs text-amber-700">
            This is you, or the only active Admin, so the role cannot be changed. Make another user Admin first.
          </p>
        )}
      </div>
    </Modal>
  );
}