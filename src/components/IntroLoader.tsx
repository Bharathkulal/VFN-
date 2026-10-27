"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { VolleyballGraphic } from "./VolleyballIcon";

interface IntroLoaderProps {
  onComplete: () => void;
}

export function IntroLoader({ onComplete }: IntroLoaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If the user prefers reduced motion, transition quickly after minimal display
    if (shouldReduceMotion) {
      const quickTimer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(quickTimer);
    }

    // Smooth progress simulation over ~1.8 seconds, completing at ~2.0 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(prev + 5, 100);
      });
    }, 70);

    // Guaranteed completion safety trigger so user is NEVER stuck
    const safetyTimer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimer);
    };
  }, [onComplete, shouldReduceMotion]);

  // Framer Motion animation configurations
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.4,
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.98,
      transition: { duration: 0.4, ease: "easeInOut" },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 16,
      scale: shouldReduceMotion ? 1 : 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="status"
      aria-live="polite"
      aria-label="Loading Volleyball Friends Nalthur tournament registration"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#070a0e] text-white px-6 py-12 select-none"
    >
      {/* Top Bar with Skip Link for Fast Access */}
      <div className="w-full max-w-md flex justify-end">
        <button
          type="button"
          onClick={onComplete}
          className="text-xs uppercase tracking-wider text-amber-400/80 hover:text-white px-3 py-1.5 rounded-full border border-amber-500/30 hover:border-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
        >
          Skip Intro →
        </button>
      </div>

      {/* Centerpiece Hero */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Volleyball Graphic with Subtle Pulse */}
        <motion.div
          variants={itemVariants}
          className="mb-8"
        >
          <div className="relative">
            <VolleyballGraphic size={128} />
          </div>
        </motion.div>

        {/* Tournament Name */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase font-sans">
            Volleyball Friends Nalthur
          </h1>
          <p className="text-xs sm:text-sm font-bold tracking-[0.25em] text-amber-400 uppercase">
            Official Tournament Registration
          </p>
        </motion.div>

        {/* Tournament Edition Tag */}
        <motion.div variants={itemVariants} className="mt-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-[11px] font-bold text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Trophy 2026 • Season 2026
          </span>
        </motion.div>
      </div>

      {/* Bottom Progress Bar */}
      <motion.div
        variants={itemVariants}
        className="w-full max-w-xs flex flex-col items-center gap-2"
      >
        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-amber-500/30">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.1 }}
          />
        </div>
        <span className="text-[10px] font-mono tracking-wider text-amber-400/80 uppercase">
          {progress < 100 ? "Preparing tournament roster..." : "Ready"}
        </span>
      </motion.div>
    </motion.div>
  );
}
