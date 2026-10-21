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
    <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-neutral-200 shadow-xl shadow-emerald-950/5 space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="admin-username"
            className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
          >
            Username
          </label>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
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
              className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password Field with Show/Hide Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
            >
              Password
            </label>
          </div>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
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
              className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-11 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 focus:outline-none cursor-pointer"
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
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dev Credentials: <strong>admin</strong> / <strong>admin</strong></span>
          </div>
          <button
            type="button"
            onClick={handleFillDevCredentials}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[50px] rounded-xl bg-[#0a2e1b] hover:bg-[#072416] active:scale-[0.99] text-white text-sm font-extrabold tracking-wider uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a2e1b] focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
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
    <div className="min-h-screen bg-[#f4f7f4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top back to site link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-emerald-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournament Registration</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#072416] text-emerald-300 border-2 border-emerald-600/40 shadow-md">
            <VolleyballIcon size={32} strokeColor="#a7f3d0" accentColor="#062113" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-0.5">
              Volleyball Friends Nalthur Trophy 2026
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Authorized Committee Access • Season 2026
            </p>
          </div>
        </div>

        {/* Suspense boundary wrapping useSearchParams */}
        <Suspense
          fallback={
            <div className="bg-white py-12 px-6 rounded-3xl border border-neutral-200 text-center text-xs text-neutral-400">
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
