"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw, ShieldCheck, Sparkles, UserCheck, Lock } from "lucide-react";
import { RegisteredPlayerData } from "@/lib/submitHandler";

interface SubmissionFeedbackProps {
  record: RegisteredPlayerData;
  onReset: () => void;
}

export function SubmissionFeedback({
  record,
  onReset,
}: SubmissionFeedbackProps) {
  return (
    <div className="w-full bg-white rounded-3xl border border-neutral-200/90 shadow-xl shadow-emerald-950/5 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Official Success Badge & Serial Number Highlight */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-300 flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900 text-white text-xs font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Official Player Serial #{record.formattedSerial}</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 uppercase tracking-tight pt-1">
            Registration Confirmed!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md">
            Your player record has been saved to the tournament database.
          </p>
        </div>
      </div>

      {/* Validated Player Card */}
      <div className="rounded-2xl border border-emerald-900/15 bg-emerald-50/25 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>Registered Player Profile</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            Registered at {record.registeredAt}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Photo Thumbnail */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-200 border-2 border-emerald-800/30 shadow-xs flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.photoUrl}
              alt={`${record.name}'s tournament photo`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Player Metadata Grid */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Player Name
              </span>
              <p className="text-base font-bold text-neutral-900">
                {record.name}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Village
              </span>
              <p className="text-sm font-semibold text-neutral-800">
                {record.village}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Playing Role
              </span>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0a2e1b] text-emerald-100">
                  {record.role}
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Phone Number
              </span>
              <p className="text-sm font-mono font-semibold text-neutral-800">
                {record.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-emerald-900/10 flex flex-wrap items-center justify-between text-[11px] text-neutral-500 gap-2">
          <span>Tournament: Volleyball Friends Nalthur Trophy 2026</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Poster Status: {record.posterStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-1/2 py-3.5 px-4 rounded-xl bg-[#0a2e1b] hover:bg-[#072416] text-white text-xs sm:text-sm font-extrabold tracking-wider uppercase transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 focus:ring-2 focus:ring-[#0a2e1b] focus:ring-offset-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Register Another Player</span>
        </button>

        <Link
          href="/admin/login"
          className="w-full sm:w-1/2 py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-neutral-400 text-center"
        >
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span>Admin Portal</span>
        </Link>
      </div>

      <div className="text-center pt-1">
        <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Database record confirmed with unique serial allocation</span>
        </p>
      </div>
    </div>
  );
}
