import React from "react";
import { VolleyballIcon } from "./VolleyballIcon";

export function TournamentHeader() {
  return (
    <header className="w-full bg-[#072416] text-white border-b border-emerald-900/60 sticky top-0 z-30 shadow-sm backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sports Emblem Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-900/90 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-300 shadow-inner">
            <VolleyballIcon size={24} strokeColor="#a7f3d0" accentColor="#062113" />
          </div>

          {/* Typography Brand Identity */}
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white uppercase leading-tight">
              Volleyball Friends Nalthur
            </h1>
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
              Official Player Registration
            </p>
          </div>
        </div>

        {/* Minimal Sports Status Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-[11px] font-medium text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Season 2026
          </span>
        </div>
      </div>
    </header>
  );
}
