"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import {
  fetchPlayersList,
  updatePlayerRecord,
  deletePlayerRecord,
  getPlayerPosterUrl,
  regeneratePlayerPoster,
  getMediaUrl,
  downloadExportExcel,
  downloadExportPowerPoint,
  PlayerRecord,
} from "@/lib/adminApi";
import { PLAYING_ROLES, PlayingRole } from "@/lib/validation";

const POSTER_STATUSES = ["pending", "generated", "failed"] as const;

export default function RegisteredPlayersPage() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [posterStatusFilter, setPosterStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("serial_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});

  // Modal states
  const [viewingPlayer, setViewingPlayer] = useState<PlayerRecord | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRecord | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerRecord | null>(null);

  // Edit form state
  const [editSerial, setEditSerial] = useState<number | "">("");
  const [editName, setEditName] = useState("");
  const [editVillage, setEditVillage] = useState("");
  const [editRole, setEditRole] = useState<PlayingRole>("Attacker");
  const [editPhone, setEditPhone] = useState("");
  const [editPosterStatus, setEditPosterStatus] = useState<string>("pending");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await fetchPlayersList({
        q: searchQuery,
        village: villageFilter,
        role: roleFilter,
        poster_status: posterStatusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });
      setPlayers(res.players);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Could not load players.");
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, villageFilter, roleFilter, posterStatusFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenEdit = (player: PlayerRecord) => {
    setEditingPlayer(player);
    setEditSerial(player.serial_number);
    setEditName(player.player_name);
    setEditVillage(player.village);
    setEditRole((player.playing_role === "Spiker" ? "Attacker" : player.playing_role) as PlayingRole);
    setEditPhone(player.phone_number);
    setEditPosterStatus(player.poster_status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      setEditSubmitting(true);
      setActionError(null);

      const updatePayload: Parameters<typeof updatePlayerRecord>[1] = {
        player_name: editName.trim(),
        village: editVillage.trim(),
        playing_role: editRole,
        phone_number: editPhone.trim(),
        poster_status: editPosterStatus,
      };

      if (editSerial !== "" && Number(editSerial) !== editingPlayer.serial_number) {
        updatePayload.serial_number = Number(editSerial);
      }

      await updatePlayerRecord(editingPlayer.id, updatePayload);
      const finalSerial = editSerial !== "" ? String(editSerial).padStart(2, "0") : editingPlayer.formatted_serial;
      showSuccess(`Player #${finalSerial} (${editName.trim()}) updated successfully!`);
      setEditingPlayer(null);
      loadPlayers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to update player details.");
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      setActionError(null);
      await downloadExportExcel();
      showSuccess("Players Master Excel/CSV list downloaded successfully!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to export Excel spreadsheet.");
      }
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPowerPoint = async () => {
    try {
      setExportingPptx(true);
      setActionError(null);
      await downloadExportPowerPoint();
      showSuccess("Auction PowerPoint slides (.pptx) downloaded successfully!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to export PowerPoint slides.");
      }
    } finally {
      setExportingPptx(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlayer) return;

    try {
      setDeleteSubmitting(true);
      await deletePlayerRecord(deletingPlayer.id);
      showSuccess(`Player #${deletingPlayer.formatted_serial} (${deletingPlayer.player_name}) permanently deleted.`);
      setDeletingPlayer(null);
      loadPlayers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete player.");
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getPosterStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "generated":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Generated</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const handleRegeneratePoster = async (playerId: string, playerName: string) => {
    try {
      setRegeneratingIds((prev) => ({ ...prev, [playerId]: true }));
      setActionError(null);
      const updated = await regeneratePlayerPoster(playerId);
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
      if (viewingPlayer && viewingPlayer.id === playerId) {
        setViewingPlayer(updated);
      }
      showSuccess(`Poster for ${playerName} regenerated with uncropped photo & synced to Cloudinary!`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError(`Failed to regenerate poster for ${playerName}.`);
      }
    } finally {
      setRegeneratingIds((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#0a2e1b] text-white text-xs font-bold shadow-xl border border-emerald-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Controls Card in Black & Gold */}
      <div className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Registered Players ({total})
            </h2>
            <p className="text-xs text-neutral-400">
              Manage player records, review photos, and prepare for auction posters
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-400/60 text-xs font-bold text-amber-300 bg-[#121820] hover:bg-[#1a232f] transition-colors cursor-pointer disabled:opacity-50"
              title="Export all players to Excel-compatible CSV with UTF-8 BOM"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-amber-400 ${exportingExcel ? "animate-spin" : ""}`} />
              <span>{exportingExcel ? "Exporting..." : "Export CSV"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPowerPoint}
              disabled={exportingPptx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Export 16:9 widescreen auction bidding slides (.pptx)"
            >
              <Presentation className={`w-3.5 h-3.5 text-slate-950 ${exportingPptx ? "animate-spin" : ""}`} />
              <span>{exportingPptx ? "Generating..." : "Export Auction PPTX"}</span>
            </button>

            <button
              type="button"
              onClick={loadPlayers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700/80 hover:border-neutral-600 text-xs font-bold text-neutral-300 bg-[#121820] hover:bg-[#1a232f] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span>Refresh Table</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search name or serial..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] px-3 py-2 text-xs text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#0b0e14] text-neutral-400">All Roles</option>
            {PLAYING_ROLES.map((r) => (
              <option key={r} value={r} className="bg-[#0b0e14] text-white">
                {r}
              </option>
            ))}
          </select>

          {/* Poster Status Filter */}
          <select
            value={posterStatusFilter}
            onChange={(e) => {
              setPosterStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] px-3 py-2 text-xs text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#0b0e14] text-neutral-400">All Poster Statuses</option>
            <option value="pending" className="bg-[#0b0e14] text-white">Pending</option>
            <option value="generated" className="bg-[#0b0e14] text-white">Generated</option>
            <option value="failed" className="bg-[#0b0e14] text-white">Failed</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] px-3 py-2 text-xs text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none cursor-pointer"
          >
            <option value="serial_number" className="bg-[#0b0e14] text-white">Sort by Serial Number</option>
            <option value="created_at" className="bg-[#0b0e14] text-white">Sort by Registration Date</option>
            <option value="player_name" className="bg-[#0b0e14] text-white">Sort by Player Name</option>
          </select>

          {/* Sort Direction */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-700/80 bg-[#080b0f] hover:bg-[#121820] text-xs font-bold text-amber-400 transition-colors cursor-pointer"
          >
            <span>Order: {sortOrder.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Players Table in Black & Gold */}
      <div className="bg-[#0d1217] rounded-3xl border border-neutral-800/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#090c10] text-neutral-400 uppercase tracking-wider text-[11px] font-extrabold border-b border-neutral-800">
                <th className="py-3.5 px-4 text-center w-20">Serial</th>
                <th className="py-3.5 px-4 w-16">Photo</th>
                <th className="py-3.5 px-4">Player Name</th>
                <th className="py-3.5 px-4">Village</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-center">Poster</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {loading && players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading player records from database...</span>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 space-y-1">
                    <p className="font-bold text-white">No players match the criteria.</p>
                    <p className="text-[11px] text-neutral-500">
                      Try clearing your search query or registering new tournament players.
                    </p>
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#11171f] transition-colors group"
                  >
                    {/* Serial Number */}
                    <td className="py-3 px-4 text-center font-mono font-black text-white">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-black border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-xs">
                          #{p.formatted_serial}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          title={`Edit Serial #${p.formatted_serial} (${p.player_name})`}
                          aria-label={`Edit Serial Number for ${p.player_name}`}
                          className="p-1 rounded-md text-neutral-500 hover:text-amber-400 hover:bg-[#18202c] transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-2 px-4">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(p.photo_url)}
                          alt={p.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-3 px-4 font-black text-white uppercase">
                      {p.player_name}
                    </td>

                    {/* Village */}
                    <td className="py-3 px-4 text-neutral-300 font-medium">
                      {p.village}
                    </td>

                    {/* Playing Role */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {p.playing_role}
                      </span>
                    </td>

                    {/* Phone Number */}
                    <td className="py-3 px-4 font-mono text-neutral-400">
                      +91 {p.phone_number.slice(0, 5)} {p.phone_number.slice(5)}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {new Date(p.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Poster Status */}
                    <td className="py-3 px-4 text-center">
                      {getPosterStatusBadge(p.poster_status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingPlayer(p)}
                          title="View Player Profile"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#18202c] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <a
                          href={getPlayerPosterUrl(p.id, true)}
                          download={`VFN_Poster_${p.formatted_serial}_${p.player_name}.png`}
                          title="Download Auction Poster"
                          className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-[#18202c] transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRegeneratePoster(p.id, p.player_name)}
                          disabled={Boolean(regeneratingIds[p.id])}
                          title="Regenerate poster with uncropped photo & sync to Cloudinary"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-[#18202c] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${Boolean(regeneratingIds[p.id]) ? "animate-spin text-amber-400" : ""}`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Player Details"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-[#18202c] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingPlayer(p)}
                          title="Delete Player"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-[#090d12] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {total > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-bold text-white">{total}</span> players
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-neutral-700 bg-[#121820] text-neutral-300 hover:bg-[#1a232f] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-amber-400 px-2 font-mono">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-neutral-700 bg-[#121820] text-neutral-300 hover:bg-[#1a232f] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW PLAYER MODAL */}
      {viewingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0d1217] rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-500/30 text-white space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-mono font-black shadow-sm">
                  #{viewingPlayer.formatted_serial}
                </span>
                <h3 className="font-black text-white text-base uppercase tracking-wider">
                  Player Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPlayer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#080b0f] border-2 border-amber-500/40 shadow-md flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(viewingPlayer.photo_url)}
                  alt={viewingPlayer.player_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2 text-xs">
                <div>
                  <span className="text-amber-400 font-bold uppercase tracking-wider block text-[10px]">
                    Player Name
                  </span>
                  <p className="text-base font-black text-white">
                    {viewingPlayer.player_name}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-amber-400/80 font-bold uppercase tracking-wider block text-[10px]">
                      Village
                    </span>
                    <p className="font-bold text-slate-200">{viewingPlayer.village}</p>
                  </div>
                  <div>
                    <span className="text-amber-400/80 font-bold uppercase tracking-wider block text-[10px]">
                      Playing Role
                    </span>
                    <p className="font-black text-amber-300">{viewingPlayer.playing_role}</p>
                  </div>
                  <div>
                    <span className="text-amber-400/80 font-bold uppercase tracking-wider block text-[10px]">
                      Phone
                    </span>
                    <p className="font-mono font-bold text-slate-200">
                      +91 {viewingPlayer.phone_number}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-emerald-400">Status: {viewingPlayer.poster_status.toUpperCase()}</span>
                  <span>Registered: {new Date(viewingPlayer.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Official Auction Poster Preview & Download */}
            <div className="space-y-2.5 pt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Official Tournament Auction Poster</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRegeneratePoster(viewingPlayer.id, viewingPlayer.player_name)}
                    disabled={Boolean(regeneratingIds[viewingPlayer.id])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${Boolean(regeneratingIds[viewingPlayer.id]) ? "animate-spin" : ""}`} />
                    <span>Regenerate Poster</span>
                  </button>
                  <a
                    href={getPlayerPosterUrl(viewingPlayer.id, true)}
                    download={`VFN_Poster_${viewingPlayer.formatted_serial}_${viewingPlayer.player_name}.png`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (PNG)</span>
                  </a>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-neutral-800 shadow-md bg-neutral-950 w-full aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    viewingPlayer.poster_url && viewingPlayer.poster_url.startsWith("http")
                      ? viewingPlayer.poster_url
                      : getPlayerPosterUrl(viewingPlayer.id)
                  }
                  alt={`${viewingPlayer.player_name}'s official auction poster`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPlayer(null)}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0d1217] rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-500/30 text-white space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-mono font-black shadow-sm">
                  #{editingPlayer.formatted_serial}
                </span>
                <h3 className="font-black text-white text-base uppercase tracking-wider">
                  Edit Player Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Serial Number Input with Duplicate Protection */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-amber-300 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Official Serial Number *</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    Current: #{editingPlayer.formatted_serial}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-black text-amber-400 text-sm">#</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={editSerial}
                    onChange={(e) => setEditSerial(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-amber-500/40 bg-[#080b0f] p-2.5 pl-8 text-xs font-mono font-black text-amber-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                    placeholder="e.g. 1, 2, 3..."
                  />
                </div>
                <p className="text-[10px] text-amber-300/80 font-medium leading-tight">
                  Duplicate prevention validates that no two players share a serial number. Changing this will safely regenerate the player's official auction poster and sync to Cloudinary.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase tracking-wider block">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-[#080b0f] p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase tracking-wider block">
                  Village *
                </label>
                <input
                  type="text"
                  required
                  value={editVillage}
                  onChange={(e) => setEditVillage(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-[#080b0f] p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase tracking-wider block">
                  Playing Role *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as PlayingRole)}
                  className="w-full rounded-xl border border-neutral-700 bg-[#080b0f] p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer"
                >
                  {PLAYING_ROLES.map((role) => (
                    <option key={role} value={role} className="bg-[#0d1217] text-white">
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase tracking-wider block">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-[#080b0f] p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase tracking-wider block">
                  Poster Status
                </label>
                <select
                  value={editPosterStatus}
                  onChange={(e) => setEditPosterStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-[#080b0f] p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer"
                >
                  <option value="pending" className="bg-[#0d1217] text-white">Pending</option>
                  <option value="generated" className="bg-[#0d1217] text-white">Generated</option>
                  <option value="failed" className="bg-[#0d1217] text-white">Failed</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-slate-950 font-black uppercase tracking-wider transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0d1217] rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-500/40 text-white space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-base uppercase tracking-wider">
                Confirm Player Deletion
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <strong className="text-amber-400">
                  Player #{deletingPlayer.formatted_serial} ({deletingPlayer.player_name})
                </strong>
                ? This will also remove the player photo from storage. This action cannot be undone.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPlayer(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {deleteSubmitting ? "Deleting..." : "Yes, Delete Player"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
