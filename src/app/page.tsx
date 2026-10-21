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
    <div className="min-h-screen flex flex-col bg-[#f6f9f6] text-neutral-900 selection:bg-emerald-800 selection:text-white">
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
          className="min-h-screen flex flex-col justify-between"
        >
          {/* Header */}
          <TournamentHeader />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col items-center justify-center">
            <RegistrationForm />
          </main>

          {/* Minimal Tournament Footer */}
          <footer className="w-full border-t border-neutral-200/80 bg-white py-6 px-4 text-center text-xs text-neutral-500">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <VolleyballIcon size={16} strokeColor="#0a2e1b" />
                <span className="font-bold uppercase tracking-wider text-neutral-700">
                  Volleyball Friends Nalthur
                </span>
                <span>• Village Tournament 2026</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHasLoaded(false)}
                  className="text-neutral-500 hover:text-emerald-800 text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Preview Intro Animation
                </button>
                <span className="text-neutral-300">|</span>
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
