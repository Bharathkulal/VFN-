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
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#072416] text-white px-6 py-12 select-none"
    >
      {/* Top Bar with Skip Link for Fast Access */}
      <div className="w-full max-w-md flex justify-end">
        <button
          type="button"
          onClick={onComplete}
          className="text-xs uppercase tracking-wider text-emerald-300/70 hover:text-white px-3 py-1.5 rounded-full border border-emerald-800/60 hover:border-emerald-500/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase font-sans">
            Volleyball Friends Nalthur
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-emerald-300 uppercase">
            Player Registration
          </p>
        </motion.div>

        {/* Tournament Edition Tag */}
        <motion.div variants={itemVariants} className="mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/30 text-[11px] font-medium text-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Village Tournament 2026
          </span>
        </motion.div>
      </div>

      {/* Bottom Progress Bar */}
      <motion.div
        variants={itemVariants}
        className="w-full max-w-xs flex flex-col items-center gap-2"
      >
        <div className="w-full h-1.5 bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-800/40">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-200 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.1 }}
          />
        </div>
        <span className="text-[10px] font-mono tracking-wider text-emerald-300/60 uppercase">
          {progress < 100 ? "Preparing tournament roster..." : "Ready"}
        </span>
      </motion.div>
    </motion.div>
  );
}
