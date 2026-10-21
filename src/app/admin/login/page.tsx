"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Shield, ArrowLeft } from "lucide-react";
import { VolleyballIcon } from "@/components/VolleyballIcon";
import { loginAdmin, getAdminToken } from "@/lib/adminApi";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      await loginAdmin(email.trim(), password);
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
        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="admin-email"
            className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
          >
            Admin Email Address
          </label>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vfn.com"
              className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="admin-password"
            className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
          >
            Password
          </label>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
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

      {/* Security Notice */}
      <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
        <Shield className="w-3.5 h-3.5 text-emerald-700" />
        <span>Protected by Argon2id password hashing and rate-limiting</span>
      </div>
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
            <span className="text-[11px] font-black tracking-widest text-emerald-800 uppercase">
              SportBid Admin Portal
            </span>
            <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">
              Volleyball Friends Nalthur
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Authorized Committee Login • Season 2026
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
