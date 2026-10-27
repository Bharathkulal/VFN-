"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IntroLoader } from "@/components/IntroLoader";
import { TournamentHeader } from "@/components/TournamentHeader";
import { RegistrationForm } from "@/components/RegistrationForm";
import { VolleyballIcon } from "@/components/VolleyballIcon";

export default function Home() {
  const [hasLoaded, setHasLoaded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#070a0e] text-slate-100 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Subtle Championship Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[340px] bg-amber-500/[0.07] blur-[120px] rounded-full" />

      {/* SCREEN 1: Animated Loading / Intro Page */}
      <AnimatePresence mode="wait">
        {!hasLoaded && (
          <IntroLoader
            key="intro-loader"
            onComplete={() => setHasLoaded(true)}
          />
        )}
      </AnimatePresence>

      {/* SCREEN 2: Player Registration Page */}
      {hasLoaded && (
        <motion.div
          key="registration-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen flex flex-col justify-between relative z-10"
        >
          {/* Header */}
          <TournamentHeader />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10">
            <RegistrationForm />
          </main>

          {/* Tournament Footer */}
          <footer className="w-full border-t border-amber-500/20 bg-[#0a0d12] py-6 px-4 text-center text-xs text-neutral-400">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <VolleyballIcon size={16} strokeColor="#f59e0b" />
                <span className="font-extrabold uppercase tracking-wider text-slate-200">
                  Volleyball Friends Nalthur
                </span>
                <span className="text-amber-400/90 font-medium">• Trophy 2026</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHasLoaded(false)}
                  className="text-amber-400 hover:text-amber-300 text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Preview Intro Animation
                </button>
                <span className="text-neutral-700">|</span>
                <span className="text-[11px] text-neutral-400">
                  Official Player Registration Portal
                </span>
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </div>
  );
}
