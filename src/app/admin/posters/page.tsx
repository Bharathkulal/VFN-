"use client";

import React, { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react";
import { fetchPlayersList, PlayerRecord } from "@/lib/adminApi";

export default function AuctionPostersPage() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRecord | null>(null);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const res = await fetchPlayersList({
        q: searchQuery,
        poster_status: statusFilter,
        page: 1,
        page_size: 50,
      });
      setPlayers(res.players);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Phase 2 Architecture Notice */}
      <div className="rounded-3xl bg-emerald-950/80 border border-emerald-800/80 p-5 sm:p-6 text-white space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-black uppercase tracking-tight">
            Phase 1 Poster Queue Preparation
          </h2>
        </div>
        <p className="text-xs text-emerald-200/90 leading-relaxed max-w-3xl">
          All registered player records now track <code>poster_status</code> (<strong>Pending</strong>, <strong>Generated</strong>, or <strong>Failed</strong>) and have reserved <code>poster_url</code> fields in MongoDB.
          In <strong>Phase 2</strong>, automatic background poster generation will render the official player auction card and make it downloadable.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search player or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 pl-9 pr-3 py-2 text-xs focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b] focus:outline-none cursor-pointer"
          >
            <option value="">All Poster Statuses</option>
            <option value="pending">Pending</option>
            <option value="generated">Generated</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadPlayers}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Grid of Players and Poster States */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500 text-xs">
          Loading auction poster queue...
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200/90 p-12 text-center text-neutral-500 space-y-2">
          <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="font-bold text-sm text-neutral-700">No players in auction queue</p>
          <p className="text-xs text-neutral-400">
            Players registered through the public portal will automatically queue for Phase 2 poster generation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((p) => {
            const isGenerated = p.poster_status === "generated" && p.poster_url;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs hover:border-emerald-800/40 transition-all flex flex-col justify-between"
              >
                {/* Poster Preview or Placeholder */}
                <div className="relative aspect-[4/5] bg-neutral-900 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                  {isGenerated ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.poster_url!}
                      alt={`Auction poster for ${p.player_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Phase 1 Professional Placeholder */
                    <div className="w-full h-full rounded-xl border border-dashed border-emerald-500/30 bg-[#072416] p-4 flex flex-col items-center justify-between text-white select-none">
                      <div className="flex items-center justify-between w-full text-[10px] text-emerald-300 font-mono font-bold">
                        <span>#{p.formatted_serial}</span>
                        <span>VFN 2026</span>
                      </div>

                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/40 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt={p.player_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-black text-xs uppercase leading-tight line-clamp-1">
                          {p.player_name}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900 border border-emerald-600/50 text-emerald-200 font-semibold">
                          {p.playing_role}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          <span>Phase 2 Queue</span>
                        </span>
                        <p className="text-[9px] text-emerald-400/60 font-mono">
                          Awaiting Poster Engine
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Serial Badge */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                    #{p.formatted_serial}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-3.5 space-y-1.5 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs truncate">
                      {p.player_name}
                    </span>
                    <span className="text-[11px] text-neutral-500">{p.village}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 font-mono">
                      +91 {p.phone_number.slice(0, 5)}...
                    </span>
                    <span className="font-bold capitalize text-amber-700">
                      {p.poster_status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
