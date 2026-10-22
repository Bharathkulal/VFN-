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
} from "lucide-react";
import {
  fetchDashboardStats,
  DashboardStats,
  LatestRegistration,
  getPlayerPosterUrl,
  getMediaUrl,
} from "@/lib/adminApi";
import { VolleyballIcon } from "@/components/VolleyballIcon";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoster, setSelectedPoster] = useState<LatestRegistration | null>(null);

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
  const latestList = stats.latest_registrations || [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Tournament Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#072416] via-[#0a2e1b] to-[#0e4329] text-white p-6 sm:p-8 shadow-md border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-widest uppercase text-emerald-300">
              Admin Control Center
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
            {stats.tournament_name || "Volleyball Friends Nalthur Trophy 2026"}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Live tournament metrics, village representation, and player registration oversight.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/players"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#072416] text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs"
          >
            <span>Registered Players</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics Required by User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Registered Players */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Registered Players
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

        {/* Metric 2: Registrations Today */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Registrations Today
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

        {/* Metric 3: Total Villages Represented */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Villages Represented
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {stats.total_villages_represented}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              Distinct villages participating
            </p>
          </div>
        </div>

        {/* Metric 4: Latest Registrations Count / Quick Link */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Latest Registrations
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {latestList.length}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              Recent player submissions
            </p>
          </div>
        </div>
      </div>

      {/* Latest Registrations Feed / Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900 text-emerald-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 uppercase tracking-tight">
                Latest Registrations
              </h2>
              <p className="text-xs text-neutral-500">
                Most recently submitted player records
              </p>
            </div>
          </div>

          <Link
            href="/admin/players"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {latestList.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-600">No players registered yet</p>
            <p className="text-xs text-neutral-400">
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
                  className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-700/40 transition-all flex flex-col"
                >
                  {/* Poster Preview (16:9 Banner) */}
                  <div className="relative aspect-[16/9] bg-neutral-950 w-full overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterPreviewUrl}
                      alt={`${player.player_name}'s official poster`}
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                    />

                    {/* Serial Number Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#072416]/90 border border-emerald-500/30 text-amber-300 text-[11px] font-mono font-black shadow-sm">
                      #{player.formatted_serial}
                    </div>

                    {/* Quick Hover Action Overlays */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
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
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* Player Details & Action Buttons */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      {/* Player Photo Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(player.photo_url)}
                          alt={player.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-neutral-900 truncate uppercase">
                          {player.player_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                          <span className="truncate">{player.village}</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-800">{player.playing_role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Download Action Button */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                      <a
                        href={posterDownloadUrl}
                        download={filename}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Poster</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedPoster(player)}
                        title="View Full Poster"
                        className="p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 hover:text-emerald-900 transition-colors cursor-pointer"
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
                Live count of registered players by volleyball position
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
              Share the registration link or register players to populate position breakdown statistics.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a2e1b] text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#072416] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Open Registration Page</span>
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
          href="/admin/tournament"
          className="group rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900 transition-colors">
              Tournament Settings
            </h3>
            <p className="text-xs text-neutral-500">
              Manage tournament name, ground venue, rules, and organizers
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/backup"
          className="group rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs hover:border-emerald-800 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900 transition-colors">
              Backup & Recovery
            </h3>
            <p className="text-xs text-neutral-500">
              Create, download, and restore JSON snapshots of tournament data
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Poster Preview Modal */}
      {selectedPoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedPoster(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-[#072416] text-amber-300 font-mono font-black text-xs">
                  #{selectedPoster.formatted_serial}
                </span>
                <div>
                  <h3 className="text-base font-black text-neutral-900 uppercase">
                    {selectedPoster.player_name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {selectedPoster.village} • {selectedPoster.playing_role} • +91 {selectedPoster.phone_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Res Poster Image */}
            <div className="relative aspect-[16/9] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-md">
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
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
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
