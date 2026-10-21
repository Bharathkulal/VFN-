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
    <div className="w-full bg-white rounded-3xl border border-neutral-200/90 shadow-xl shadow-emerald-950/5 p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Green success icon with checkmark */}
      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center shadow-xs mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      {/* Main headings */}
      <div className="space-y-3 mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight uppercase">
          REGISTRATION COMPLETE!
        </h2>
        <p className="text-sm sm:text-base text-neutral-600 max-w-md mx-auto">
          Your registration has been submitted successfully.
        </p>
        <div className="pt-2">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs sm:text-sm font-semibold">
            Tournament: Volleyball Friends Nalthur Trophy 2026
          </span>
        </div>
      </div>

      {/* Single action button: Register Another Player */}
      <div className="max-w-xs mx-auto">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-4 px-6 rounded-2xl bg-[#0a2e1b] hover:bg-[#072416] text-white text-sm font-extrabold tracking-wider uppercase transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 focus:ring-2 focus:ring-[#0a2e1b] focus:ring-offset-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Register Another Player</span>
        </button>
      </div>
    </div>
  );
}
