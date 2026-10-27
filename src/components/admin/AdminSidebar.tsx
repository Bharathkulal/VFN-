"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Database,
  Image as ImageIcon,
  Settings,
  LogOut,
  X,
  Shield,
  ChevronRight,
} from "lucide-react";
import { VolleyballIcon } from "@/components/VolleyballIcon";
import { logoutAdmin, AdminUser } from "@/lib/adminApi";

interface AdminSidebarProps {
  adminUser?: AdminUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({
  adminUser,
  isOpen = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/admin" || pathname === "/admin/dashboard",
    },
    {
      name: "Registered Players",
      href: "/admin/players",
      icon: Users,
      active: pathname.startsWith("/admin/players"),
    },
    {
      name: "Tournament Settings",
      href: "/admin/tournament",
      icon: Trophy,
      active: pathname.startsWith("/admin/tournament"),
    },
    {
      name: "Backup & Recovery",
      href: "/admin/backup",
      icon: Database,
      active: pathname.startsWith("/admin/backup"),
    },
    {
      name: "Auction Posters",
      href: "/admin/posters",
      icon: ImageIcon,
      active: pathname.startsWith("/admin/posters"),
    },
    {
      name: "System Settings",
      href: "/admin/settings",
      icon: Settings,
      active: pathname.startsWith("/admin/settings"),
    },
  ];

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#070a0e] text-slate-100 select-none border-r border-amber-500/20">
      {/* Brand Header */}
      <div className="p-5 border-b border-amber-500/20 flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 group"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
            <VolleyballIcon size={22} strokeColor="#f59e0b" accentColor="#1a1408" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
              VFN Admin Portal
            </span>
            <span className="text-sm font-black text-white leading-tight uppercase tracking-tight">
              Nalthur 2026
            </span>
          </div>
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400/60">
          Navigation
        </div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                item.active
                  ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 shadow-sm border-l-4 border-amber-400"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? "text-amber-400" : "text-neutral-500"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.active && <ChevronRight className="w-4 h-4 text-amber-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Admin User Profile & Logout */}
      <div className="p-4 border-t border-amber-500/20 bg-[#0a0d12] space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {adminUser?.full_name || "Committee Admin"}
            </p>
            <p className="text-[11px] text-amber-400/70 truncate font-mono">
              {adminUser?.username ? `@${adminUser.username}` : (adminUser?.email || "admin")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-30 border-r border-amber-500/20">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
