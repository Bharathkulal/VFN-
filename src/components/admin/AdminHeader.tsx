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
    <header className="sticky top-0 z-20 w-full bg-white border-b border-neutral-200/90 shadow-2xs">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="md:hidden p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-black text-neutral-900 uppercase tracking-tight leading-tight">
              {title}
            </h1>
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Admin Management Portal</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 hover:border-emerald-800 text-xs font-bold text-neutral-700 hover:text-emerald-900 hover:bg-emerald-50/40 transition-colors shadow-2xs"
          >
            <VolleyballIcon size={14} strokeColor="#0a2e1b" />
            <span className="hidden sm:inline">Public Registration</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
