"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  RefreshCw,
  Trophy,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";
import { fetchDashboardStats, DashboardStats } from "@/lib/adminApi";
import { VolleyballIcon } from "@/components/VolleyballIcon";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load tournament statistics.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">
          Loading Tournament Metrics...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h2 className="font-bold text-sm">Failed to Load Dashboard Metrics</h2>
        </div>
        <p className="text-xs text-rose-700">{error || "Unknown server error."}</p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const roleEntries = Object.entries(stats.players_by_role || {});
  const isEmpty = stats.total_registered_players === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#072416] to-[#0d3f26] text-white p-6 sm:p-8 shadow-md border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-300">
              Live Tournament Stats
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
            {stats.tournament_name}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Player roster overview, position counts, and auction poster generation queue.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
          <Link
            href="/admin/players"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#072416] text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs"
          >
            <span>Manage Players</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Players */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Players
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-900 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {stats.total_registered_players}
            </p>
            <p className="text-[11px] font-semibold text-emerald-800">
              Assigned sequential numbers (01+)
            </p>
          </div>
        </div>

        {/* Today's Registrations */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Registered Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {stats.today_registrations}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              Registrations in last 24h
            </p>
          </div>
        </div>

        {/* Posters Generated */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Posters Generated
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {stats.posters_generated}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              Phase 2 Auction Ready
            </p>
          </div>
        </div>

        {/* Posters Awaiting Generation */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Posters Pending
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {stats.posters_pending}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              Awaiting automatic generation
            </p>
          </div>
        </div>
      </div>

      {/* Playing Role Distribution */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900 text-emerald-300 flex items-center justify-center">
              <VolleyballIcon size={16} strokeColor="#a7f3d0" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 uppercase tracking-tight">
                Squad Position Breakdown
              </h2>
              <p className="text-xs text-neutral-500">
                Live count of players by volleyball position
              </p>
            </div>
          </div>
        </div>

        {isEmpty ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-700">No players registered yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Share the registration link or register the first tournament player to populate squad statistics.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a2e1b] text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#072416] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register First Player</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {roleEntries.map(([role, count]) => (
              <div
                key={role}
                className="rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 text-center space-y-1 hover:border-emerald-700/40 transition-colors"
              >
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block truncate">
                  {role}
                </span>
                <span className="text-2xl font-black text-neutral-900 block">
                  {count}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {stats.total_registered_players > 0
                    ? `${Math.round((count / stats.total_registered_players) * 100)}% of squad`
                    : "0%"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/players"
          className="group rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900 transition-colors">
              Registered Players
            </h3>
            <p className="text-xs text-neutral-500">
              Search, filter, view photos, edit details, and delete entries
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/posters"
          className="group rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900 transition-colors">
              Auction Posters Queue
            </h3>
            <p className="text-xs text-neutral-500">
              Track poster generation status for Phase 2 player auctions
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/tournament"
          className="group rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900 transition-colors">
              Tournament Details
            </h3>
            <p className="text-xs text-neutral-500">
              Manage tournament name, ground venue, and official rules
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
