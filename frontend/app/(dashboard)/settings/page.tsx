"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Building2, Camera, Check, CheckCircle2, Circle, KeyRound, Mail, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { PageHeader, Panel, TextField } from "@/components/ui/page-layout";
import { darkBtn, outBtn } from "@/components/master/module-kit";
import { Button } from "@/components/ui/button";

/* =====================================================================
   My Profile — Profile · Security (password) · Company Profile
   TODO(permissions): Company tab abhi sabko dikhta hai. Permission lagane par
   neeche `canViewCompany` / `canEditCompany` ko real check se replace karo,
   e.g. user?.role === "SuperAdmin".
   ===================================================================== */

type ProfileUser = {
  id?: string; _id?: string; name?: string; email?: string; phone?: string;
  role?: string; departmentId?: string | null; status?: string;
};
type CompanyProfile = { companyName: string; ownerName: string; email: string; phone: string; address: string };
type Tab = "profile" | "security" | "company";
type Notice = { type: "success" | "error"; text: string } | null;

const EMPTY_COMPANY: CompanyProfile = { companyName: "", ownerName: "", email: "", phone: "", address: "" };
const EMPTY_PW = { current: "", next: "", confirm: "" };
const MAX_LOGO_MB = 2;

/* ---------- API stubs: inhe apne backend se connect karo ---------- */
async function changePasswordApi(_payload: { currentPassword: string; newPassword: string; signOutOthers: boolean }): Promise<void> {
  // TODO: await fetch("/api/auth/change-password", { method: "POST", headers: {...}, body: JSON.stringify(_payload) })
  // Wrong current password par error throw karo: throw new Error("Current password galat hai.")
  await new Promise((r) => setTimeout(r, 700));
}
async function requestResetLinkApi(_email: string): Promise<void> {
  // TODO: await fetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: _email }) })
  await new Promise((r) => setTimeout(r, 600));
}

/* ---------- password rules ---------- */
const RULES = [
  { id: "len", label: "Kam se kam 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Ek capital letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "Ek small letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "Ek number (0–9)", test: (p: string) => /\d/.test(p) },
  { id: "sym", label: "Ek special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = [
  { label: "Bahut kamzor", bar: "bg-red-500", text: "text-red-600" },
  { label: "Kamzor", bar: "bg-red-500", text: "text-red-600" },
  { label: "Theek-thaak", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Achha", bar: "bg-lime-500", text: "text-lime-700" },
  { label: "Bahut mazboot", bar: "bg-emerald-500", text: "text-emerald-600" },
];

const initials = (name?: string) => (name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [company, setCompany] = useState<CompanyProfile>(EMPTY_COMPANY);
  const [savedCompany, setSavedCompany] = useState<CompanyProfile>(EMPTY_COMPANY);
  const [logoName, setLogoName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [companyNotice, setCompanyNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // password state
  const [pw, setPw] = useState(EMPTY_PW);
  const [showPw, setShowPw] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // TODO(permissions): replace these two with real permission checks
  const canViewCompany = true;
  const canEditCompany = true;

  useEffect(() => {
    // Change this key if your login flow stores the user under a different key.
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        setUser(parsed?.data?.user ?? parsed?.user ?? parsed);
      }
      const rawCompany = localStorage.getItem("companyProfile");
      if (rawCompany) {
        const c = { ...EMPTY_COMPANY, ...(JSON.parse(rawCompany) as CompanyProfile) };
        setCompany(c);
        setSavedCompany(c);
      }
    } catch {
      // Connect to the backend API for authoritative profile data when ready.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  /* ---------- company ---------- */
  const dirty = JSON.stringify(company) !== JSON.stringify(savedCompany);
  const companyError = useMemo(() => {
    if (!company.companyName.trim()) return "Company name zaroori hai.";
    if (company.email && !/^\S+@\S+\.\S+$/.test(company.email)) return "Company email sahi format me daalo.";
    if (company.phone && company.phone.replace(/\D/g, "").length < 10) return "Company phone kam se kam 10 digit ka hona chahiye.";
    return "";
  }, [company]);

  const setCompanyField = (key: keyof CompanyProfile) => (value: string) => {
    setCompanyNotice(null);
    setCompany((p) => ({ ...p, [key]: value }));
  };
  const saveCompany = () => {
    if (companyError) return;
    localStorage.setItem("companyProfile", JSON.stringify(company));
    setSavedCompany(company);
    setCompanyNotice({ type: "success", text: "Company details save ho gayi." });
  };
  const discardCompany = () => { setCompany(savedCompany); setCompanyNotice(null); };

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setCompanyNotice({ type: "error", text: "Sirf image file (PNG, JPG, SVG) choose karo." });
    if (file.size > MAX_LOGO_MB * 1024 * 1024) return setCompanyNotice({ type: "error", text: `Logo ${MAX_LOGO_MB} MB se chhota hona chahiye.` });
    setCompanyNotice(null);
    setLogoName(file.name);
    setLogoPreview(URL.createObjectURL(file));
    // Preview only; connect Cloudinary/R2 and your backend upload API later.
  };
  const removeLogo = () => { setLogoName(""); setLogoPreview(""); if (fileRef.current) fileRef.current.value = ""; };

  /* ---------- password ---------- */
  const passed = RULES.filter((r) => r.test(pw.next)).length;
  const strength = pw.next ? STRENGTH[Math.max(0, passed - 1)] : null;
  const pwError =
    !pw.current ? "Abhi ka (current) password daalo."
    : !RULES.slice(0, 4).every((r) => r.test(pw.next)) ? "New password rules poore karo (8+ characters, capital, small letter aur number)."
    : pw.next === pw.current ? "New password purane password se alag hona chahiye."
    : pw.confirm !== pw.next ? "New password aur confirm password match nahi kar rahe."
    : "";

  const submitPassword = async () => {
    if (pwError || pwBusy) return;
    setPwBusy(true);
    setPwNotice(null);
    try {
      await changePasswordApi({ currentPassword: pw.current, newPassword: pw.next, signOutOthers });
      setPw(EMPTY_PW);
      setPwNotice({ type: "success", text: "Password badal gaya. Agli baar login par naya password use karo." });
    } catch (e) {
      setPwNotice({ type: "error", text: e instanceof Error && e.message ? e.message : "Password change nahi ho paya. Dobara try karo." });
    } finally {
      setPwBusy(false);
    }
  };
  const sendResetLink = async () => {
    if (!user?.email || resetBusy) return;
    setResetBusy(true);
    setPwNotice(null);
    try {
      await requestResetLinkApi(user.email);
      setPwNotice({ type: "success", text: `Reset link ${user.email} par bhej diya gaya hai.` });
    } catch {
      setPwNotice({ type: "error", text: "Reset link nahi bheja ja saka. Thodi der baad try karo." });
    } finally {
      setResetBusy(false);
    }
  };

  if (!loaded) return null;

  const tabs: { id: Tab; label: string; hint: string; icon: ReactNode; show: boolean }[] = [
    { id: "profile", label: "My Profile", hint: "Account details", icon: <UserRound size={18} />, show: true },
    { id: "security", label: "Security", hint: "Password & reset", icon: <KeyRound size={18} />, show: true },
    { id: "company", label: "Company Profile", hint: "Business details", icon: <Building2 size={18} />, show: canViewCompany },
  ];
  const active = user?.status ? user.status === "Active" : true;

  return (
    <div className="space-y-4">
      <PageHeader title="My Profile" subtitle="Apna account, password aur company ki details ek jagah manage karo." />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Panel className="h-fit p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Profile sections">
            {tabs.filter((t) => t.show).map((t) => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} aria-current={activeTab === t.id ? "page" : undefined}
                className={`flex min-w-[170px] items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:min-w-0 ${activeTab === t.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                {t.icon}
                <span><span className="block text-sm font-semibold leading-tight">{t.label}</span><span className={`block text-xs ${activeTab === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.hint}</span></span>
              </button>
            ))}
          </nav>
        </Panel>

        <Panel className="overflow-hidden">
          {/* ===================== MY PROFILE ===================== */}
          {activeTab === "profile" && (
            <div>
              <div className="h-24 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900" />
              <div className="space-y-6 px-5 pb-6 sm:px-6">
                <div className="-mt-10 flex flex-wrap items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-950 text-2xl font-bold text-white shadow-sm">{initials(user?.name)}</div>
                  <div className="min-w-0 flex-1 pb-1">
                    <h2 className="truncate text-xl font-bold text-slate-900">{user?.name || "Logged-in User"}</h2>
                    <p className="text-sm text-slate-500">{user?.email || "Email not available"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"><ShieldCheck size={13} /> {user?.role || "Role not available"}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} /> {user?.status || "Active"}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">Personal information</h3>
                  <p className="mt-1 text-sm text-slate-500">Aapke login se juda account detail.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoItem icon={<UserRound size={17} />} label="Full name" value={user?.name} />
                  <InfoItem icon={<Mail size={17} />} label="Email address" value={user?.email} />
                  <InfoItem icon={<Phone size={17} />} label="Phone number" value={user?.phone} />
                  <InfoItem icon={<ShieldCheck size={17} />} label="Role" value={user?.role} />
                  <InfoItem icon={<Building2 size={17} />} label="Department ID" value={user?.departmentId || "Not assigned"} />
                  <InfoItem icon={<Check size={17} />} label="Account status" value={user?.status || "Not available"} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Password</p>
                    <p className="text-sm text-slate-500">Account safe rakhne ke liye time-time par password badalte raho.</p>
                  </div>
                  <Button variant="outline" className={outBtn} onClick={() => setActiveTab("security")}><KeyRound size={16} className="mr-2" /> Change password</Button>
                </div>
                <p className="text-sm text-slate-500">Name ya phone number badalna ho to apne administrator se contact karo.</p>
              </div>
            </div>
          )}

          {/* ===================== SECURITY ===================== */}
          {activeTab === "security" && (
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Security</h2>
                <p className="mt-1 text-sm text-slate-500">Password badlo ya agar purana yaad nahi hai to email par reset link mangao.</p>
              </div>

              {pwNotice && <NoticeBar notice={pwNotice} />}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <TextField label="Current password" type={showPw ? "text" : "password"} value={pw.current} onChange={(v) => { setPwNotice(null); setPw((p) => ({ ...p, current: v })); }} />
                  <TextField label="New password" type={showPw ? "text" : "password"} value={pw.next} onChange={(v) => { setPwNotice(null); setPw((p) => ({ ...p, next: v })); }} />
                  {strength && (
                    <div aria-live="polite">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < passed ? strength.bar : "bg-slate-200"}`} />)}
                      </div>
                      <p className={`mt-1 text-xs font-medium ${strength.text}`}>Password strength: {strength.label}</p>
                    </div>
                  )}
                  <TextField label="Confirm new password" type={showPw ? "text" : "password"} value={pw.confirm} onChange={(v) => { setPwNotice(null); setPw((p) => ({ ...p, confirm: v })); }} />

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Passwords dikhao
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                    <span>Password badalne ke baad baaki sabhi devices se logout kar do <span className="block text-xs text-slate-500">Recommended — agar kisi aur ke paas aapka login ho to wo band ho jayega.</span></span>
                  </label>

                  {(pw.current || pw.next || pw.confirm) && pwError && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} /> {pwError}</p>}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button className={darkBtn} disabled={!!pwError || pwBusy} onClick={submitPassword}>
                      <KeyRound size={16} className="mr-2" /> {pwBusy ? "Updating…" : "Update password"}
                    </Button>
                    <Button variant="outline" className={outBtn} disabled={!pw.current && !pw.next && !pw.confirm} onClick={() => { setPw(EMPTY_PW); setPwNotice(null); }}>Clear</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Password rules</p>
                    <ul className="mt-3 space-y-2">
                      {RULES.map((r) => {
                        const ok = r.test(pw.next);
                        return (
                          <li key={r.id} className={`flex items-center gap-2 text-sm ${ok ? "text-emerald-700" : "text-slate-500"}`}>
                            {ok ? <CheckCircle2 size={16} /> : <Circle size={16} />} {r.label}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">Special character optional hai, par password ko aur mazboot banata hai.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Password yaad nahi?</p>
                    <p className="mt-1 text-sm text-slate-500">Hum aapki registered email par reset link bhej denge{user?.email ? <>: <span className="font-medium text-slate-700">{user.email}</span></> : "."}</p>
                    <Button variant="outline" className={`${outBtn} mt-3 w-full`} disabled={!user?.email || resetBusy} onClick={sendResetLink}>
                      <Mail size={16} className="mr-2" /> {resetBusy ? "Sending…" : "Send reset link"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== COMPANY PROFILE ===================== */}
          {activeTab === "company" && canViewCompany && (
            <div className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
                  <p className="mt-1 text-sm text-slate-500">Company ki wo details jo software me (invoice, quotation etc.) dikhti hain.</p>
                </div>
                {canEditCompany && (
                  <div className="flex items-center gap-2">
                    {dirty && <span className="mr-1 text-xs font-medium text-amber-600">Unsaved changes</span>}
                    <Button variant="outline" className={outBtn} onClick={discardCompany} disabled={!dirty}>Discard</Button>
                    <Button className={darkBtn} onClick={saveCompany} disabled={!dirty || !!companyError}><Check size={16} className="mr-2" /> Save changes</Button>
                  </div>
                )}
              </div>

              {companyNotice && <NoticeBar notice={companyNotice} />}
              {dirty && companyError && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} /> {companyError}</p>}

              <fieldset disabled={!canEditCompany} className="space-y-6 disabled:opacity-80">
                <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Company logo preview" className="h-full w-full object-contain" />
                    ) : <Building2 size={30} className="text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Company logo</h3>
                    <p className="mt-1 text-sm text-slate-500">PNG, JPG ya SVG · max {MAX_LOGO_MB} MB. Square ya horizontal logo best rehta hai.</p>
                    {logoName && <p className="mt-1 text-xs text-slate-600">{logoName}</p>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className={outBtn} onClick={() => fileRef.current?.click()}><Camera size={16} className="mr-2" /> {logoPreview ? "Change" : "Choose logo"}</Button>
                    {logoPreview && <Button type="button" variant="ghost" size="icon" aria-label="Remove logo" onClick={removeLogo}><Trash2 size={16} /></Button>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField className="sm:col-span-2" label="Company name" value={company.companyName} onChange={setCompanyField("companyName")} />
                  <TextField label="Owner / contact person" value={company.ownerName} onChange={setCompanyField("ownerName")} />
                  <TextField label="Company phone" type="tel" value={company.phone} onChange={setCompanyField("phone")} />
                  <TextField label="Company email" type="email" value={company.email} onChange={setCompanyField("email")} />
                  <TextField className="sm:col-span-2" label="Company address" value={company.address} onChange={setCompanyField("address")} />
                </div>
              </fieldset>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Document preview</p>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {logoPreview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logoPreview} alt="" className="h-full w-full object-contain" />
                      : <Building2 size={22} className="text-slate-400" />}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-bold text-slate-900">{company.companyName || "Your company name"}</p>
                    <p className="truncate text-slate-600">{company.address || "Company address"}</p>
                    <p className="truncate text-slate-500">{[company.phone, company.email].filter(Boolean).join(" · ") || "Phone · Email"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Invoice aur quotation ke header me details aise dikhengi.</p>
              </div>

              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Company details abhi sirf is browser me save hoti hain. Sabhi users ke liye permanent settings aur logo upload ke liye protected backend API connect karni hogi.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function NoticeBar({ notice }: { notice: NonNullable<Notice> }) {
  const ok = notice.type === "success";
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
      <span>{notice.text}</span>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-4">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "Not provided"}</p>
      </div>
    </div>
  );
}