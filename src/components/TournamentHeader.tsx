import React from "react";
import { VolleyballIcon } from "./VolleyballIcon";

export function TournamentHeader() {
  return (
    <header className="w-full bg-[#0a0d12]/95 text-white border-b border-amber-500/20 sticky top-0 z-30 shadow-md backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sports Emblem Icon in Gold */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-inner">
            <VolleyballIcon size={22} strokeColor="#f59e0b" accentColor="#1a1408" />
          </div>

          {/* Typography Brand Identity */}
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-tight">
              Volleyball Friends Nalthur
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-amber-400 uppercase">
              Official Player Registration
            </p>
          </div>
        </div>

        {/* Sports Status Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-[11px] font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Season 2026
          </span>
        </div>
      </div>
    </header>
  );
}
