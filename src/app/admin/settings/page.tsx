"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  Database,
  Cloud,
  Key,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
} from "lucide-react";
import { getAdminMe, AdminUser } from "@/lib/adminApi";

export default function AdminSettingsPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminMe()
      .then((data) => setAdminUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Admin Profile Overview */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-neutral-900 uppercase tracking-tight">
              Administrator Profile
            </h2>
            <p className="text-xs text-neutral-500">
              Authenticated session and permission credentials
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-neutral-500 py-4">Loading admin profile...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Administrator Name
              </span>
              <p className="font-bold text-neutral-900 text-sm">
                {adminUser?.full_name || "Tournament Admin"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Email Address
              </span>
              <p className="font-mono font-bold text-neutral-900 text-sm">
                {adminUser?.email || "admin@vfn.com"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Account Status
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Active Administrator
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Last Login
              </span>
              <p className="text-neutral-700 font-mono">
                {adminUser?.last_login
                  ? new Date(adminUser.last_login).toLocaleString()
                  : "Current Session"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Database & Storage Architecture Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* MongoDB Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">MongoDB Database</h3>
              <p className="text-[11px] text-neutral-500">Atomic serial counters & indexed collections</p>
            </div>
          </div>

          <div className="text-xs space-y-2 text-neutral-600">
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-400">Database Name:</span>
              <span className="font-mono font-bold text-neutral-800">sportbid_vfn</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-400">Driver:</span>
              <span className="font-bold text-neutral-800">Motor (AsyncIO)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-400">Unique Index:</span>
              <span className="font-bold text-emerald-700">serial_number (Unique)</span>
            </div>
          </div>
        </div>

        {/* Cloudinary Storage Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Cloud Storage</h3>
              <p className="text-[11px] text-neutral-500">Player portrait uploads</p>
            </div>
          </div>

          <div className="text-xs space-y-2 text-neutral-600">
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-400">Provider:</span>
              <span className="font-bold text-neutral-800">Cloudinary SDK</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-400">Folder:</span>
              <span className="font-mono text-neutral-800">vfn_tournament_2026/players</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-400">Fallback Mode:</span>
              <span className="font-bold text-neutral-800">Local Disk Storage Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Management & Bootstrap Guide */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-7 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 text-neutral-900 font-bold text-sm uppercase tracking-wide">
          <Key className="w-4 h-4 text-emerald-700" />
          <span>Security & Credential Updates</span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          For production security, passwords are never stored in plain text and public registration is disabled.
          To update or add administrators securely, run the CLI bootstrap command on the backend server:
        </p>
        <div className="rounded-xl bg-[#072416] text-emerald-300 font-mono text-xs p-3.5 border border-emerald-900/60 overflow-x-auto">
          python backend/bootstrap_admin.py --email admin@vfn.com --password &quot;NewPassword2026!&quot;
        </div>
      </div>
    </div>
  );
}
