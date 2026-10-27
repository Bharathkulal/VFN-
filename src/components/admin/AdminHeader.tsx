"use client";

import React from "react";
import Link from "next/link";
import { Menu, ExternalLink, ShieldCheck } from "lucide-react";
import { VolleyballIcon } from "@/components/VolleyballIcon";

interface AdminHeaderProps {
  title: string;
  onOpenMobileNav?: () => void;
}

export function AdminHeader({ title, onOpenMobileNav }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 w-full bg-[#0a0d12]/95 border-b border-amber-500/20 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="md:hidden p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-tight leading-tight">
              {title}
            </h1>
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Management Portal</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-400/60 text-xs font-bold text-amber-300 hover:text-amber-200 bg-[#0f141b] hover:bg-amber-500/10 transition-colors shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/vfn_logo.png"
              alt="VFN Logo"
              className="w-4 h-4 object-contain rounded-full"
            />
            <span className="hidden sm:inline">Public Registration</span>
            <ExternalLink className="w-3 h-3 text-amber-400/60" />
          </Link>
        </div>
      </div>
    </header>
  );
}
