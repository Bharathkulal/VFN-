"use client";

import React from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { RegisteredPlayerData } from "@/lib/submitHandler";

interface SubmissionFeedbackProps {
  record?: RegisteredPlayerData;
  onReset: () => void;
}

export function SubmissionFeedback({ onReset }: SubmissionFeedbackProps) {
  return (
    <div className="w-full bg-[#0d1217] rounded-3xl border border-amber-500/30 shadow-2xl shadow-black/80 p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Gold success icon with checkmark */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border-2 border-amber-500/40 flex items-center justify-center shadow-lg mb-6">
        <CheckCircle2 className="w-10 h-10 text-amber-400" />
      </div>

      {/* Main headings */}
      <div className="space-y-3 mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
          Registration Complete!
        </h2>
        <p className="text-sm sm:text-base text-neutral-300 max-w-md mx-auto">
          Your player registration has been submitted successfully to the tournament database.
        </p>
        <div className="pt-2">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold">
            Tournament: Volleyball Friends Nalthur Trophy 2026
          </span>
        </div>
      </div>

      {/* Single action button: Register Another Player */}
      <div className="max-w-xs mx-auto">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 text-sm font-black tracking-wider uppercase transition-all duration-150 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <RotateCcw className="w-4 h-4 text-slate-950" />
          <span>Register Another Player</span>
        </button>
      </div>
    </div>
  );
}
