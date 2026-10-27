"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Image as ImageIcon,
  Download,
  Eye,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  CloudCheck,
} from "lucide-react";
import {
  fetchPlayersList,
  getPlayerPosterUrl,
  regeneratePlayerPoster,
  getMediaUrl,
  PlayerRecord,
} from "@/lib/adminApi";
import { PLAYING_ROLES } from "@/lib/validation";

export default function AuctionPostersPage() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [previewPoster, setPreviewPoster] = useState<PlayerRecord | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPlayersList({
        q: searchQuery,
        role: roleFilter,
        page: 1,
        page_size: 100,
      });
      setPlayers(res.players);
      setTotal(res.total);
    } catch {
      // ignore error
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const handleRegenerate = async (playerId: string, playerName: string) => {
    try {
      setRegeneratingIds((prev) => ({ ...prev, [playerId]: true }));
      setActionMessage(null);
      const updated = await regeneratePlayerPoster(playerId);
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
      if (previewPoster && previewPoster.id === playerId) {
        setPreviewPoster(updated);
      }
      setActionMessage({
        text: `Poster for ${playerName} regenerated and synced to Cloudinary!`,
        type: "success",
      });
    } catch (err: any) {
      setActionMessage({
        text: `Failed to regenerate poster for ${playerName}: ${err.message || "Server error"}`,
        type: "error",
      });
    } finally {
      setRegeneratingIds((prev) => ({ ...prev, [playerId]: false }));
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner in Black & Gold */}
      <div className="rounded-3xl bg-gradient-to-r from-[#090d12] via-[#0f141b] to-[#141b24] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-400">
              VFN Auction Identity
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
            Official Auction Posters Gallery
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">
            High-resolution player auction cards generated with tournament gold branding, portrait zoom, and Karna Creation identity. Persisted on Cloudinary CDN.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPlayers}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh Posters</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            actionMessage.type === "success"
              ? "bg-[#0a2e1b]/95 border-emerald-500/50 text-emerald-100 shadow-lg"
              : "bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-lg"
          } animate-in fade-in slide-in-from-top-2`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="p-1 hover:opacity-70 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by player name or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-neutral-700/80 bg-[#080b0f] px-3 py-2 text-xs text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#0b0e14] text-neutral-400">All Playing Roles</option>
            {PLAYING_ROLES.map((r) => (
              <option key={r} value={r} className="bg-[#0b0e14] text-white">
                {r}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-amber-400 whitespace-nowrap self-end sm:self-auto">
          {total} Player Poster{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Posters Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-amber-400/80">
            Rendering Player Posters...
          </p>
        </div>
      ) : players.length === 0 ? (
        <div className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-white">No registered players found</p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            When players register on the website, their auction posters will be automatically prepared and downloadable right here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {players.map((p) => {
            // Direct Cloudinary CDN URL decoupling from Render ephemeral disk
            const posterSrc =
              p.poster_url && p.poster_url.startsWith("http")
                ? p.poster_url
                : getPlayerPosterUrl(p.id);

            const downloadSrc = getPlayerPosterUrl(p.id, true);
            const filename = `VFN_2026_Poster_#${p.formatted_serial}_${p.player_name}.png`;
            const isCloudinary = Boolean(p.poster_url && p.poster_url.includes("cloudinary.com"));
            const isFailed = p.poster_status === "failed";
            const isRegenerating = Boolean(regeneratingIds[p.id]);

            return (
              <div
                key={p.id}
                className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 overflow-hidden shadow-lg hover:shadow-2xl hover:border-amber-500/40 transition-all flex flex-col"
              >
                {/* Poster Preview (16:9 banner) */}
                <div className="relative aspect-[16/9] bg-black w-full overflow-hidden group">
                  {/* Status Badges */}
                  <div className="absolute top-3 right-3 z-10">
                    {isCloudinary ? (
                      <span className="px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Cloudinary CDN
                      </span>
                    ) : isFailed ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-950/85 backdrop-blur-md border border-rose-500/40 text-[10px] font-bold text-rose-300 flex items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Upload Failed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-950/85 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Pending
                      </span>
                    )}
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterSrc}
                    alt={`${p.player_name}'s poster`}
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                    loading="lazy"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewPoster(p)}
                      className="px-3 py-1.5 rounded-xl bg-white/95 text-neutral-900 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={downloadSrc}
                      download={filename}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                {/* Footer details, Regenerate, & Download actions */}
                <div className="p-4 sm:p-5 flex items-center justify-between border-t border-neutral-800 bg-[#090d12] gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-black border border-amber-500/40 text-amber-300 flex items-center justify-center font-mono font-black text-xs flex-shrink-0">
                      #{p.formatted_serial}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate uppercase">
                        {p.player_name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {p.village} • <span className="font-bold text-amber-400">{p.playing_role}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Regenerate Button */}
                    <button
                      type="button"
                      onClick={() => handleRegenerate(p.id, p.player_name)}
                      disabled={isRegenerating}
                      title="Regenerate poster with latest styles and upload directly to Cloudinary"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-700/80 bg-[#121820] hover:bg-[#1a232f] active:scale-95 text-neutral-300 hover:text-amber-400 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-neutral-400 ${isRegenerating ? "animate-spin text-amber-400" : ""}`}
                      />
                    </button>

                    {/* Download Button */}
                    <a
                      href={downloadSrc}
                      download={filename}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-amber-500/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewPoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-[#0d1217] rounded-3xl p-5 sm:p-6 shadow-2xl border border-amber-500/30 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-white">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-black border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
                  #{previewPoster.formatted_serial}
                </span>
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-white">
                  {previewPoster.player_name} • Official Poster
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerate(previewPoster.id, previewPoster.player_name)}
                  disabled={Boolean(regeneratingIds[previewPoster.id])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121820] hover:bg-[#1a232f] border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${Boolean(regeneratingIds[previewPoster.id]) ? "animate-spin text-amber-400" : ""}`} />
                  <span>Regenerate Poster</span>
                </button>
                <a
                  href={getPlayerPosterUrl(previewPoster.id, true)}
                  download={`VFN_2026_Poster_#${previewPoster.formatted_serial}_${previewPoster.player_name}.png`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (PNG)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPoster(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Poster Image */}
            <div className="rounded-2xl overflow-hidden bg-black aspect-[16/9] w-full flex items-center justify-center shadow-inner border border-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  previewPoster.poster_url && previewPoster.poster_url.startsWith("http")
                    ? previewPoster.poster_url
                    : getPlayerPosterUrl(previewPoster.id)
                }
                alt={`${previewPoster.player_name}'s official auction poster`}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
