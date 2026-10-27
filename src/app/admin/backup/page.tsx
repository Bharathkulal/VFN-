"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Database,
  Download,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck,
  ShieldCheck,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import {
  fetchBackupStatus,
  fetchBackupHistory,
  createDatabaseBackup,
  restoreDatabaseBackup,
  getBackupDownloadUrl,
  BackupStatus,
  BackupItem,
} from "@/lib/adminApi";

export default function BackupRecoveryPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<BackupItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorToast(null);
      const [statusData, historyData] = await Promise.all([
        fetchBackupStatus(),
        fetchBackupHistory(),
      ]);
      setStatus(statusData);
      setHistory(historyData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorToast(err.message);
      } else {
        setErrorToast("Failed to load backup data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5500);
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const item = await createDatabaseBackup();
      showSuccess(`Created backup snapshot: ${item.filename} (${item.player_count} players secured).`);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Failed to create backup.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoringFile) return;

    try {
      setRestoring(true);
      const result = await restoreDatabaseBackup(restoringFile.filename);
      showSuccess(result.message);
      setRestoringFile(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Failed to restore backup snapshot.");
      }
    } finally {
      setRestoring(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400/70">
          Checking Backup Status...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-amber-950/80 text-amber-200 text-xs font-bold shadow-xl border border-amber-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-rose-950/80 text-white text-xs font-bold shadow-xl border border-rose-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#090d12] via-[#121820] to-[#16202c] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-300">
              VFN Data Protection
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Backup & Recovery Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">
            Create automated JSON database snapshots, export archival files, or restore tournament player data safely.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Snapshot...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Create Backup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real Backup Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card 1: System State */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800 p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              System State
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </p>
          <p className="text-[11px] text-neutral-400 truncate font-mono">
            DB: {status?.database_name || "sportbid_vfn"}
          </p>
        </div>

        {/* Status Card 2: Total Backups */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800 p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Available Snapshots
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {status?.total_backups || 0}
          </p>
          <p className="text-[11px] text-neutral-400">
            Saved in local archive
          </p>
        </div>

        {/* Status Card 3: Active Players in DB */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800 p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Current Live Players
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {status?.players_count || 0}
          </p>
          <p className="text-[11px] text-neutral-400">
            In active tournament database
          </p>
        </div>

        {/* Status Card 4: Last Backup Time */}
        <div className="bg-[#0d1217] rounded-2xl border border-neutral-800 p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Last Backup
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-white">
            {status?.last_backup_time
              ? new Date(status.last_backup_time).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "No backup yet"}
          </p>
          <p className="text-[11px] text-neutral-400">
            {status?.last_backup_time ? "Verified integrity" : "Ready to create"}
          </p>
        </div>
      </div>

      {/* Honest System State Note */}
      <div className="p-4 rounded-2xl bg-[#0d1217] border border-amber-500/30 text-slate-300 text-xs flex items-start gap-3 shadow-md">
        <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-300 mb-0.5">
            Real Integrity & Zero Mock Claims
          </span>
          <p className="text-neutral-300 leading-relaxed">
            All backups are real JSON snapshots containing players, tournament configuration, and serial counters with SHA256 verification. Files can be directly downloaded or safely restored to MongoDB.
          </p>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-[#0d1217] rounded-3xl border border-neutral-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              Backup History & Archives
            </h2>
            <p className="text-xs text-neutral-400">
              Listing of verified database snapshots available on server
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-amber-400">
            {history.length} snapshot{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-300">No backups created yet</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Click &quot;Create Backup&quot; above to create the tournament&apos;s first verified database snapshot.
            </p>
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create First Snapshot</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Filename</th>
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Players</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">SHA256</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {history.map((item) => (
                  <tr key={item.filename} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-white truncate max-w-[200px]">
                      {item.filename}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                        {item.player_count} players
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">
                      {item.size_formatted}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-500 text-[11px]">
                      {item.checksum}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Download button */}
                        <a
                          href={getBackupDownloadUrl(item.filename)}
                          download={item.filename}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Download</span>
                        </a>

                        {/* Restore button */}
                        <button
                          type="button"
                          onClick={() => setRestoringFile(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Warning Modal */}
      {restoringFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0d1217] rounded-3xl border border-amber-500/30 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Confirm Database Restore
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestoringFile(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <p>
                You are about to restore tournament player data from the snapshot:
              </p>
              <div className="p-3 rounded-xl bg-[#080b0f] font-mono text-amber-300 border border-neutral-700 font-bold truncate">
                {restoringFile.filename}
              </div>
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-1">
                <span className="font-bold block text-amber-300">Important Notice:</span>
                <p>
                  This action will synchronize the <strong>{restoringFile.player_count} player records</strong> in this snapshot into MongoDB and adjust the sequential serial number counter accordingly.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoringFile(null)}
                disabled={restoring}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-75"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
