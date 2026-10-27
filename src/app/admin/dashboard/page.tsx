"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  Shield,
  Database,
  Trophy,
  Download,
  Eye,
  X,
  Sparkles,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  Phone,
  Filter,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  fetchDashboardStats,
  DashboardStats,
  LatestRegistration,
  getPlayerPosterUrl,
  getMediaUrl,
  downloadExportExcel,
  downloadExportPowerPoint,
  fetchPlayersList,
  PlayerRecord,
} from "@/lib/adminApi";
import { VolleyballIcon } from "@/components/VolleyballIcon";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoster, setSelectedPoster] = useState<PlayerRecord | LatestRegistration | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPpt, setExportingPpt] = useState(false);
  const [exportToast, setExportToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Position breakdown interactive filter state
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePlayers, setRolePlayers] = useState<PlayerRecord[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const positionSectionRef = React.useRef<HTMLDivElement>(null);

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
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400/80">
          Loading Tournament Metrics...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <h2 className="font-bold text-sm text-white">Failed to Load Dashboard Metrics</h2>
        </div>
        <p className="text-xs text-rose-300/90">{error || "Unknown server error."}</p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-800 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const handleDownloadCsv = async () => {
    try {
      setExportingCsv(true);
      await downloadExportExcel();
      setExportToast({ message: "Master player CSV exported successfully!", type: "success" });
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV";
      setExportToast({ message: msg, type: "error" });
      setTimeout(() => setExportToast(null), 5000);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDownloadPpt = async () => {
    try {
      setExportingPpt(true);
      await downloadExportPowerPoint();
      setExportToast({ message: "Auction PowerPoint deck (.pptx) generated successfully!", type: "success" });
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export PowerPoint presentation";
      setExportToast({ message: msg, type: "error" });
      setTimeout(() => setExportToast(null), 5000);
    } finally {
      setExportingPpt(false);
    }
  };

  const handleSelectRole = async (role: string) => {
    if (selectedRole === role) {
      setSelectedRole(null);
      setRolePlayers([]);
      setRoleError(null);
      return;
    }

    setSelectedRole(role);
    setRoleLoading(true);
    setRoleError(null);

    try {
      const res = await fetchPlayersList({
        role,
        page: 1,
        page_size: 100,
        sort_by: "serial_number",
        sort_order: "asc",
      });
      setRolePlayers(res.players);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRoleError(err.message);
      } else {
        setRoleError(`Could not load players for ${role}.`);
      }
    } finally {
      setRoleLoading(false);
    }
  };

  const roleEntries = Object.entries(stats.players_by_role || {});
  const isEmpty = stats.total_registered_players === 0;
  const latestList = stats.latest_registrations || [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {exportToast && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            exportToast.type === "success"
              ? "bg-[#0a2e1b]/95 border-emerald-500/50 text-emerald-100"
              : "bg-rose-950/95 border-rose-500/50 text-rose-100"
          }`}
        >
          {exportToast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <p className="text-xs font-bold flex-1">{exportToast.message}</p>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-white/60 hover:text-white text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tournament Header Banner in Black & Gold */}
      <div className="rounded-3xl bg-gradient-to-r from-[#090d12] via-[#0f141b] to-[#141b24] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-400">
              Admin Control Center
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
            {stats.tournament_name || "Volleyball Friends Nalthur Trophy 2026"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">
            Live tournament metrics, village representation, and player registration oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Download CSV Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={exportingCsv || isEmpty}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#11161d] hover:bg-[#161d27] border border-amber-500/30 hover:border-amber-400/60 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download complete registration data as CSV"
          >
            {exportingCsv ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{exportingCsv ? "Exporting CSV..." : "Download CSV"}</span>
          </button>

          {/* Download PPT Button (Championship Gold) */}
          <button
            type="button"
            onClick={handleDownloadPpt}
            disabled={exportingPpt || isEmpty}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
            title="Export all player posters into a 16:9 widescreen PowerPoint deck"
          >
            {exportingPpt ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
            ) : (
              <Presentation className="w-3.5 h-3.5 text-slate-950" />
            )}
            <span>{exportingPpt ? "Generating PPT..." : "Download PPT"}</span>
          </button>

          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/players"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98"
          >
            <span>Registered Players</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics Required by User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Registered Players */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Total Registered Players
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-white tracking-tight">
              {stats.total_registered_players}
            </p>
            <p className="text-[11px] font-bold text-amber-400">
              Assigned sequential numbers (01+)
            </p>
          </div>
        </div>

        {/* Metric 2: Registrations Today */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Registrations Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-white tracking-tight">
              {stats.today_registrations}
            </p>
            <p className="text-[11px] font-medium text-neutral-400">
              Registrations in last 24h
            </p>
          </div>
        </div>

        {/* Metric 3: Total Villages Represented */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Villages Represented
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-white tracking-tight">
              {stats.total_villages_represented}
            </p>
            <p className="text-[11px] font-medium text-neutral-400">
              Distinct villages participating
            </p>
          </div>
        </div>

        {/* Metric 4: Latest Registrations Count */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Latest Registrations
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-white tracking-tight">
              {latestList.length}
            </p>
            <p className="text-[11px] font-medium text-neutral-400">
              Recent player submissions
            </p>
          </div>
        </div>
      </div>

      {/* Latest Registrations Feed */}
      <div className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Latest Registrations
              </h2>
              <p className="text-xs text-neutral-400">
                Most recently submitted player records
              </p>
            </div>
          </div>

          <Link
            href="/admin/players"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {latestList.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-400">No players registered yet</p>
            <p className="text-xs text-neutral-500">
              When players submit the public registration form, their details will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestList.map((player) => {
              const posterPreviewUrl =
                player.poster_url && player.poster_url.startsWith("http")
                  ? player.poster_url
                  : getPlayerPosterUrl(player.id);
              const posterDownloadUrl = getPlayerPosterUrl(player.id, true);
              const filename = `VFN_2026_Poster_#${player.formatted_serial}_${player.player_name}.png`;

              return (
                <div
                  key={player.id}
                  className="rounded-2xl border border-neutral-800/90 bg-[#080b0f] overflow-hidden shadow-md hover:shadow-xl hover:border-amber-500/40 transition-all flex flex-col"
                >
                  {/* Poster Preview (16:9 Banner) */}
                  <div className="relative aspect-[16/9] bg-black w-full overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterPreviewUrl}
                      alt={`${player.player_name}'s official poster`}
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                    />

                    {/* Serial Number Badge (Gold) */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/90 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-black shadow-sm">
                      #{player.formatted_serial}
                    </div>

                    {/* Quick Hover Action Overlays */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedPoster(player)}
                        className="px-3 py-1.5 rounded-lg bg-white/95 text-neutral-900 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-white cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <a
                        href={posterDownloadUrl}
                        download={filename}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* Player Details & Action Buttons */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between bg-[#0b0e14]">
                    <div className="flex items-center gap-3">
                      {/* Player Photo Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 flex-shrink-0 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(player.photo_url)}
                          alt={player.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white truncate uppercase">
                          {player.player_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                          <span className="truncate">{player.village}</span>
                          <span>•</span>
                          <span className="font-bold text-amber-400">{player.playing_role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Download Action Button */}
                    <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
                      <a
                        href={posterDownloadUrl}
                        download={filename}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Poster</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedPoster(player)}
                        title="View Full Poster"
                        className="p-1.5 rounded-xl border border-neutral-700/80 bg-[#121820] hover:bg-[#1a232f] text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Playing Role Distribution - Clickable Squad Position Breakdown in Black & Gold */}
      <div
        ref={positionSectionRef}
        className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 p-6 sm:p-7 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <VolleyballIcon size={16} strokeColor="#f59e0b" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-tight">
                  Squad Position Breakdown
                </h2>
                {selectedRole && (
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                    Filtered: {selectedRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Click any position card below to view all registered players in that court role
              </p>
            </div>
          </div>

          {selectedRole && (
            <button
              type="button"
              onClick={() => {
                setSelectedRole(null);
                setRolePlayers([]);
                setRoleError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-[#121820] hover:bg-[#1a232f] text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
              <span>Clear Filter / Close</span>
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-300">No players registered yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Share the registration link or register players to populate position breakdown statistics.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm hover:brightness-110 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Open Registration Page</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 6 Clickable Position Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              {roleEntries.map(([role, count]) => {
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`rounded-2xl border p-4 text-center space-y-1.5 transition-all cursor-pointer text-left sm:text-center relative group focus:outline-hidden ${
                      isSelected
                        ? "border-2 border-amber-400 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/20"
                        : "border-neutral-800/80 bg-[#080b0f] hover:bg-[#0f141b] hover:border-amber-500/40 hover:shadow-sm active:scale-98"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 ring-4 ring-amber-400/20 animate-pulse" />
                    )}
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider block truncate ${
                        isSelected
                          ? "text-amber-300 font-black"
                          : "text-neutral-400 group-hover:text-amber-300"
                      }`}
                    >
                      {role}
                    </span>
                    <span
                      className={`text-2xl font-black block tracking-tight ${
                        isSelected ? "text-amber-300" : "text-white"
                      }`}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {stats.total_registered_players > 0
                        ? `${Math.round((count / stats.total_registered_players) * 100)}% of squad`
                        : "0%"}
                    </span>
                    <div className="pt-1 border-t border-neutral-800/60">
                      <span
                        className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                          isSelected
                            ? "text-amber-300"
                            : "text-neutral-500 group-hover:text-amber-400"
                        }`}
                      >
                        {isSelected ? "Active filter" : "View players →"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filtered Players Display Section */}
            {selectedRole && (
              <div className="rounded-3xl border border-amber-500/30 bg-[#090d12] p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
                {/* Section Header with Quick Switchers */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-xs">
                      {rolePlayers.length}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <span>{selectedRole} Registered Roster</span>
                        <span className="text-xs font-bold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 font-mono">
                          {rolePlayers.length} {rolePlayers.length === 1 ? "player" : "players"}
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Showing all verified players registered under court position &apos;{selectedRole}&apos;
                      </p>
                    </div>
                  </div>

                  {/* Quick Role Switcher Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-neutral-400 mr-1 hidden sm:inline">
                      Switch Role:
                    </span>
                    {roleEntries.map(([r, c]) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSelectRole(r)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          selectedRole === r
                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm"
                            : "bg-[#11161d] border border-neutral-700/80 text-neutral-300 hover:border-amber-400 hover:text-white"
                        }`}
                      >
                        {r} ({c})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole(null);
                        setRolePlayers([]);
                      }}
                      title="Close position view"
                      className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* State 1: Loading */}
                {roleLoading && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono uppercase tracking-wider text-amber-400/80">
                      Loading registered {selectedRole}s from database...
                    </p>
                  </div>
                )}

                {/* State 2: Error */}
                {!roleLoading && roleError && (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      <p className="text-xs font-semibold">{roleError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectRole(selectedRole)}
                      className="px-3 py-1.5 rounded-lg bg-rose-800 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* State 3: Empty State */}
                {!roleLoading && !roleError && rolePlayers.length === 0 && (
                  <div className="py-10 bg-[#080b0f] rounded-2xl border border-neutral-800 text-center space-y-3 p-6">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 text-amber-400 flex items-center justify-center mx-auto">
                      <VolleyballIcon size={24} strokeColor="#f59e0b" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white uppercase">
                        No {selectedRole}s Registered Yet
                      </h4>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        There are currently zero registered players with the court position &apos;{selectedRole}&apos; in the database.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href="/admin/players"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all"
                      >
                        <span>View All Registered Players</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole(null);
                          setRolePlayers([]);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-neutral-700 bg-[#121820] text-neutral-300 text-xs font-bold hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* State 4: Matching Players Grid */}
                {!roleLoading && !roleError && rolePlayers.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {rolePlayers.map((player) => {
                      const posterPreviewUrl =
                        player.poster_url && player.poster_url.startsWith("http")
                          ? player.poster_url
                          : getPlayerPosterUrl(player.id);
                      const posterDownloadUrl = getPlayerPosterUrl(player.id, true);
                      const filename = `VFN_2026_Poster_#${player.formatted_serial}_${player.player_name}.png`;

                      return (
                        <div
                          key={player.id}
                          className="rounded-2xl border border-neutral-800/90 bg-[#080b0f] overflow-hidden shadow-md hover:shadow-xl hover:border-amber-500/40 transition-all flex flex-col"
                        >
                          {/* 16:9 Poster Preview Banner */}
                          <div className="relative aspect-[16/9] bg-black w-full overflow-hidden group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={posterPreviewUrl}
                              alt={`${player.player_name}'s official poster`}
                              className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                            />

                            {/* Serial Number Badge */}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/90 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-black shadow-sm">
                              #{player.formatted_serial}
                            </div>

                            {/* Playing Role Pill */}
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold shadow-sm uppercase tracking-wider">
                              {player.playing_role}
                            </div>

                            {/* Hover Action Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
                              <button
                                type="button"
                                onClick={() => setSelectedPoster(player)}
                                className="px-2.5 py-1.5 rounded-lg bg-white/95 text-neutral-900 text-xs font-bold flex items-center gap-1 shadow-md hover:bg-white cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={posterDownloadUrl}
                                download={filename}
                                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md hover:brightness-110"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>

                          {/* Player Details & Action Buttons */}
                          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between bg-[#0b0e14]">
                            <div className="flex items-center gap-3">
                              {/* Player Photo Avatar */}
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 flex-shrink-0 shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getMediaUrl(player.photo_url)}
                                  alt={player.player_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-black text-white truncate uppercase">
                                  {player.player_name}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5 truncate">
                                  <MapPin className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                                  <span className="truncate">{player.village}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5 truncate font-mono">
                                  <Phone className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
                                  <span>+91 {player.phone_number}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
                              <a
                                href={posterDownloadUrl}
                                download={filename}
                                className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs transition-all"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => setSelectedPoster(player)}
                                title="View Full Poster"
                                className="p-1.5 rounded-xl border border-neutral-700/80 bg-[#121820] hover:bg-[#1a232f] text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/players"
          className="group rounded-2xl bg-[#0d1217] border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 hover:bg-[#10161e] transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Registered Players
            </h3>
            <p className="text-xs text-neutral-400">
              Search, filter, view photos, edit details, and delete entries
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/tournament"
          className="group rounded-2xl bg-[#0d1217] border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 hover:bg-[#10161e] transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Tournament Settings
            </h3>
            <p className="text-xs text-neutral-400">
              Manage tournament name, ground venue, rules, and organizers
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/backup"
          className="group rounded-2xl bg-[#0d1217] border border-neutral-800/80 p-5 shadow-lg hover:border-amber-500/40 hover:bg-[#10161e] transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Backup & Recovery
            </h3>
            <p className="text-xs text-neutral-400">
              Create, download, and restore JSON snapshots of tournament data
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Poster Preview Modal */}
      {selectedPoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedPoster(null)}
        >
          <div
            className="bg-[#0d1217] rounded-3xl max-w-2xl w-full border border-amber-500/30 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-black border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                  #{selectedPoster.formatted_serial}
                </span>
                <div>
                  <h3 className="text-base font-black text-white uppercase">
                    {selectedPoster.player_name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedPoster.village} • {selectedPoster.playing_role} • +91 {selectedPoster.phone_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Res Poster Image */}
            <div className="relative aspect-[16/9] bg-black rounded-2xl overflow-hidden border border-neutral-800 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selectedPoster.poster_url && selectedPoster.poster_url.startsWith("http")
                    ? selectedPoster.poster_url
                    : getPlayerPosterUrl(selectedPoster.id)
                }
                alt={`${selectedPoster.player_name}'s official poster`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400">
                Volleyball Friends Nalthur Trophy 2026 • Official Auction Poster
              </span>
              <a
                href={getPlayerPosterUrl(selectedPoster.id, true)}
                download={`VFN_2026_Poster_#${selectedPoster.formatted_serial}_${selectedPoster.player_name}.png`}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res Poster</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
