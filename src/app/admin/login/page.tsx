"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, ArrowRight, Loader2, AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { VolleyballIcon } from "@/components/VolleyballIcon";
import { loginAdmin, getAdminToken } from "@/lib/adminApi";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  // Preconfigured dev credentials: admin / admin
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isExpired ? "Your session has expired. Please log in again." : null
  );

  useEffect(() => {
    // If already authenticated, redirect straight to dashboard
    if (getAdminToken()) {
      router.push("/admin/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      await loginAdmin(username.trim(), password);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDevCredentials = () => {
    setUsername("admin");
    setPassword("admin");
    setErrorMessage(null);
  };

  return (
    <div className="bg-[#0d1217] py-8 px-6 sm:px-10 rounded-3xl border border-amber-500/25 shadow-2xl shadow-black/80 space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="admin-username"
            className="block text-xs font-bold uppercase tracking-wider text-slate-200"
          >
            Username
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <User className="w-4 h-4" />
            </div>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] pl-10 pr-3.5 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password Field with Show/Hide Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-200"
            >
              Password
            </label>
          </div>
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
              className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] pl-10 pr-11 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-amber-400 focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Preconfigured Credentials Pill */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Dev Credentials: <strong>admin</strong> / <strong>admin</strong></span>
          </div>
          <button
            type="button"
            onClick={handleFillDevCredentials}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] text-slate-950 text-sm font-black tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#070a0e] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top back to site link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournament Registration</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border-2 border-amber-500/40 shadow-xl">
            <VolleyballIcon size={32} strokeColor="#f59e0b" accentColor="#1a1408" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mt-0.5">
              Volleyball Friends Nalthur Trophy 2026
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Authorized Committee Access • Season 2026
            </p>
          </div>
        </div>

        {/* Suspense boundary wrapping useSearchParams */}
        <Suspense
          fallback={
            <div className="bg-[#0d1217] py-12 px-6 rounded-3xl border border-neutral-800 text-center text-xs text-neutral-400">
              Loading security portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
