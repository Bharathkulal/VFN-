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
  const [editRole, setEditRole] = useState<PlayingRole>("Spiker");
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
    setEditRole(player.playing_role as PlayingRole);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Generated</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
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

      {/* Header & Controls Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-neutral-900 uppercase tracking-tight">
              Registered Players ({total})
            </h2>
            <p className="text-xs text-neutral-500">
              Manage player records, review photos, and prepare for auction posters
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 hover:border-emerald-500 text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors cursor-pointer disabled:opacity-50"
              title="Export all players to Excel-compatible CSV with UTF-8 BOM"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-700 ${exportingExcel ? "animate-spin" : ""}`} />
              <span>{exportingExcel ? "Exporting..." : "Export Excel"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPowerPoint}
              disabled={exportingPptx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 hover:border-amber-500 text-xs font-black text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 transition-colors cursor-pointer disabled:opacity-50"
              title="Export 16:9 widescreen auction bidding slides (.pptx)"
            >
              <Presentation className={`w-3.5 h-3.5 text-amber-700 ${exportingPptx ? "animate-spin" : ""}`} />
              <span>{exportingPptx ? "Generating..." : "Export Auction PPTX"}</span>
            </button>

            <button
              type="button"
              onClick={loadPlayers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-400 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Table</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
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
              className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none cursor-pointer"
          >
            <option value="">All Roles</option>
            {PLAYING_ROLES.map((r) => (
              <option key={r} value={r}>
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
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none cursor-pointer"
          >
            <option value="">All Poster Statuses</option>
            <option value="pending">Pending</option>
            <option value="generated">Generated</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none cursor-pointer"
          >
            <option value="serial_number">Sort by Serial Number</option>
            <option value="created_at">Sort by Registration Date</option>
            <option value="player_name">Sort by Player Name</option>
          </select>

          {/* Sort Direction */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
          >
            <span>Order: {sortOrder.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#072416] text-white uppercase tracking-wider text-[11px] font-extrabold border-b border-emerald-950">
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
            <tbody className="divide-y divide-neutral-100">
              {loading && players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <div className="w-6 h-6 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading player records from database...</span>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500 space-y-1">
                    <p className="font-bold text-neutral-700">No players match the criteria.</p>
                    <p className="text-[11px] text-neutral-400">
                      Try clearing your search query or registering new tournament players.
                    </p>
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-emerald-50/20 transition-colors group"
                  >
                    {/* Serial Number */}
                    <td className="py-3 px-4 text-center font-mono font-black text-neutral-900">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#0a2e1b] text-white text-xs font-mono font-bold shadow-2xs">
                          #{p.formatted_serial}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          title={`Edit Serial #${p.formatted_serial} (${p.player_name})`}
                          aria-label={`Edit Serial Number for ${p.player_name}`}
                          className="p-1 rounded-md text-neutral-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-2 px-4">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(p.photo_url)}
                          alt={p.player_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      {p.player_name}
                    </td>

                    {/* Village */}
                    <td className="py-3 px-4 text-neutral-600 font-medium">
                      {p.village}
                    </td>

                    {/* Playing Role */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {p.playing_role}
                      </span>
                    </td>

                    {/* Phone Number */}
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      +91 {p.phone_number.slice(0, 5)} {p.phone_number.slice(5)}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3 px-4 text-neutral-500 text-[11px]">
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
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <a
                          href={getPlayerPosterUrl(p.id, true)}
                          download={`VFN_Poster_${p.formatted_serial}_${p.player_name}.png`}
                          title="Download Auction Poster"
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRegeneratePoster(p.id, p.player_name)}
                          disabled={Boolean(regeneratingIds[p.id])}
                          title="Regenerate poster with uncropped photo & sync to Cloudinary"
                          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${Boolean(regeneratingIds[p.id]) ? "animate-spin text-emerald-600" : ""}`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Player Details"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingPlayer(p)}
                          title="Delete Player"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="px-5 py-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
          <div>
            Showing{" "}
            <span className="font-bold text-neutral-900">
              {total > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-neutral-900">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-bold text-neutral-900">{total}</span> players
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-neutral-300 disabled:opacity-40 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-neutral-800 px-2">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-neutral-300 disabled:opacity-40 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW PLAYER MODAL */}
      {viewingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#0a2e1b] text-white text-xs font-mono font-black">
                  #{viewingPlayer.formatted_serial}
                </span>
                <h3 className="font-black text-neutral-900 text-base uppercase">
                  Player Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPlayer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-neutral-100 border-2 border-emerald-900/30 shadow-sm flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(viewingPlayer.photo_url)}
                  alt={viewingPlayer.player_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2 text-xs">
                <div>
                  <span className="text-neutral-400 font-bold uppercase tracking-wider block text-[10px]">
                    Player Name
                  </span>
                  <p className="text-base font-black text-neutral-900">
                    {viewingPlayer.player_name}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-neutral-400 font-bold uppercase tracking-wider block text-[10px]">
                      Village
                    </span>
                    <p className="font-bold text-neutral-800">{viewingPlayer.village}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-bold uppercase tracking-wider block text-[10px]">
                      Playing Role
                    </span>
                    <p className="font-bold text-emerald-900">{viewingPlayer.playing_role}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-bold uppercase tracking-wider block text-[10px]">
                      Phone
                    </span>
                    <p className="font-mono font-bold text-neutral-800">
                      +91 {viewingPlayer.phone_number}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-semibold text-emerald-800">Status: {viewingPlayer.poster_status.toUpperCase()}</span>
                  <span>Registered: {new Date(viewingPlayer.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Official Auction Poster Preview & Download */}
            <div className="space-y-2.5 pt-3 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Official Tournament Auction Poster</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRegeneratePoster(viewingPlayer.id, viewingPlayer.player_name)}
                    disabled={Boolean(regeneratingIds[viewingPlayer.id])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${Boolean(regeneratingIds[viewingPlayer.id]) ? "animate-spin" : ""}`} />
                    <span>Regenerate Poster</span>
                  </button>
                  <a
                    href={getPlayerPosterUrl(viewingPlayer.id, true)}
                    download={`VFN_Poster_${viewingPlayer.formatted_serial}_${viewingPlayer.player_name}.png`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (PNG)</span>
                  </a>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-neutral-300 shadow-md bg-neutral-950 w-full aspect-[16/9]">
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
                className="px-5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#0a2e1b] text-white text-xs font-mono font-black">
                  #{editingPlayer.formatted_serial}
                </span>
                <h3 className="font-black text-neutral-900 text-base uppercase">
                  Edit Player Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Serial Number Input with Duplicate Protection */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-950 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Official Serial Number *</span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-md">
                    Current: #{editingPlayer.formatted_serial}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-black text-amber-700 text-sm">#</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={editSerial}
                    onChange={(e) => setEditSerial(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-amber-300 bg-white p-2.5 pl-8 text-xs font-mono font-black text-neutral-900 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800"
                    placeholder="e.g. 1, 2, 3..."
                  />
                </div>
                <p className="text-[10px] text-amber-800/80 font-medium leading-tight">
                  Duplicate prevention validates that no two players share a serial number. Changing this will safely regenerate the player's official auction poster and sync to Cloudinary.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 uppercase tracking-wider block">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 uppercase tracking-wider block">
                  Village *
                </label>
                <input
                  type="text"
                  required
                  value={editVillage}
                  onChange={(e) => setEditVillage(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 uppercase tracking-wider block">
                  Playing Role *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as PlayingRole)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b] cursor-pointer"
                >
                  {PLAYING_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 uppercase tracking-wider block">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 uppercase tracking-wider block">
                  Poster Status
                </label>
                <select
                  value={editPosterStatus}
                  onChange={(e) => setEditPosterStatus(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:border-[#0a2e1b] focus:ring-1 focus:ring-[#0a2e1b] cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="generated">Generated</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0a2e1b] hover:bg-[#072416] text-white font-extrabold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-neutral-900 text-base uppercase">
                Confirm Player Deletion
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <strong>
                  Player #{deletingPlayer.formatted_serial} ({deletingPlayer.player_name})
                </strong>
                ? This will also remove the player photo from storage. This action cannot be undone.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPlayer(null)}
                className="px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer"
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
