"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sun,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  PanelsTopLeft,
  Wallet,
  CircleAlert,
} from "lucide-react";
import api from "@/lib/api";
import { showInfo, showSuccess } from "@/lib/toast";
import { authStorage } from "@/lib/auth-storage";
import { useAppDispatch } from "@/redux/hooks";
import { setCredentials } from "@/redux/features/auth/authSlice";
import type { LoginResponse } from "@/types/auth";

const highlights = [
  {
    icon: FileText,
    title: "Leads to quotations",
    text: "Every enquiry, follow-up and quotation in one place.",
  },
  {
    icon: PanelsTopLeft,
    title: "Installation tracking",
    text: "See each project from site survey to handover.",
  },
  {
    icon: Wallet,
    title: "Payments and team",
    text: "Collections, loans, staff attendance and support tickets.",
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < (isRegister ? 8 : 1)) {
      setError(isRegister ? "Password must be at least 8 characters." : "Enter your password.");
      return;
    }
    if (isRegister && (!name.trim() || !companyId.trim())) {
      setError("Name and company ID are required.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.post("/users/register", { name, email, password, companyId });
        showSuccess("Account registered. You can now sign in.");
        setIsRegister(false);
        setPassword("");
        return;
      }

      const response = await api.post<LoginResponse>("/users/login", { email, password });
      const { token, user } = response.data.data;
      authStorage.setToken(token, remember);
      dispatch(setCredentials(user));
      showSuccess("Signed in successfully.");
      router.push("/dashboard");
    } catch (requestError: any) {
      setError(requestError.userMessage || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* Brand panel with Solar Background */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        {/* Background Image with Gradient Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop')" 
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/80" />

        {/* Content wrapper to stay above background */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-500 shadow-lg">
              <Sun size={24} />
            </div>
            <div className="leading-tight">
              <p className="text-xl font-bold tracking-wide">Vanshika Solar</p>
              <p className="text-sm font-medium text-amber-500/90">ERP + CRM</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight tracking-tight drop-shadow-sm">
              Run your whole solar business from one screen.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Replace registers, Excel sheets and Google Forms with one system your
              whole team can use.
            </p>

            <ul className="mt-10 space-y-6">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-amber-400">
                    <Icon size={21} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-300">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-slate-400">
            &copy; 2026 Vanshika Solar Solution, Agra
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-[#fafafa] px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-amber-400">
              <Sun size={22} />
            </div>
            <p className="text-lg font-bold text-slate-900">Vanshika Solar</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isRegister ? "Create account" : "Sign in"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {isRegister ? "Create an employee account for your company." : "Enter your work account to open the dashboard."}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {isRegister && <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
              </div>}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  {!isRegister && <button type="button" onClick={() => showInfo(email.trim() ? `Ask your administrator to reset the password for ${email.trim()}.` : "Enter your work email, then contact your administrator to reset your password.")} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    Forgot password?
                  </button>}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isRegister && <div>
                <label htmlFor="companyId" className="mb-1.5 block text-sm font-medium text-slate-700">Company ID</label>
                <input id="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="Company MongoDB ID" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
              </div>}

              {!isRegister && <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                Keep me signed in
              </label>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  isRegister ? "Create account" : "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to Vanshika Solar?"}{" "}
            <button type="button" onClick={() => { setIsRegister((value) => !value); setError(""); }} className="font-semibold text-indigo-600 hover:text-indigo-700">
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </p>

          <p className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? "Registration creates an employee account. Ask your administrator for your company ID." : "Use the email and password associated with your work account."}
          </p>
        </div>
      </main>
    </div>
  );
}
