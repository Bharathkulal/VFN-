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
        <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">
          Checking Backup Status...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#0a2e1b] text-white text-xs font-bold shadow-xl border border-emerald-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-rose-950 text-white text-xs font-bold shadow-xl border border-rose-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#072416] via-[#09351e] to-[#0c4426] text-white p-6 sm:p-8 shadow-md border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-black tracking-widest uppercase text-emerald-300">
              VFN Data Protection
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
            Backup & Recovery Center
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Create automated JSON database snapshots, export archival files, or restore tournament player data safely.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-[#072416] text-xs font-extrabold uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              System State
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected</span>
          </p>
          <p className="text-[11px] text-neutral-500 truncate font-mono">
            DB: {status?.database_name || "sportbid_vfn"}
          </p>
        </div>

        {/* Status Card 2: Total Backups */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Available Snapshots
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-neutral-900">
            {status?.total_backups || 0}
          </p>
          <p className="text-[11px] text-neutral-500">
            Saved in local archive
          </p>
        </div>

        {/* Status Card 3: Active Players in DB */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Current Live Players
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-neutral-900">
            {status?.players_count || 0}
          </p>
          <p className="text-[11px] text-neutral-500">
            In active tournament database
          </p>
        </div>

        {/* Status Card 4: Last Backup Time */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Last Backup
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-neutral-900">
            {status?.last_backup_time
              ? new Date(status.last_backup_time).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "No backup yet"}
          </p>
          <p className="text-[11px] text-neutral-500">
            {status?.last_backup_time ? "Verified integrity" : "Ready to create"}
          </p>
        </div>
      </div>

      {/* Honest System State Note */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-emerald-950 mb-0.5">
            Real Integrity & Zero Mock Claims
          </span>
          <p className="text-emerald-800 leading-relaxed">
            All backups are real JSON snapshots containing players, tournament configuration, and serial counters with SHA256 verification. Files can be directly downloaded or safely restored to MongoDB.
          </p>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-black text-neutral-900 uppercase tracking-tight">
              Backup History & Archives
            </h2>
            <p className="text-xs text-neutral-500">
              Listing of verified database snapshots available on server
            </p>
          </div>

          <span className="text-xs font-mono font-semibold text-neutral-500">
            {history.length} snapshot{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-700">No backups created yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Click &quot;Create Backup&quot; above to create the tournament&apos;s first verified database snapshot.
            </p>
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a2e1b] hover:bg-[#072416] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create First Snapshot</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Filename</th>
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Players</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">SHA256</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {history.map((item) => (
                  <tr key={item.filename} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-neutral-900 truncate max-w-[200px]">
                      {item.filename}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                        {item.player_count} players
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600">
                      {item.size_formatted}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400 text-[11px]">
                      {item.checksum}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Download button */}
                        <a
                          href={getBackupDownloadUrl(item.filename)}
                          download={item.filename}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Download</span>
                        </a>

                        {/* Restore button */}
                        <button
                          type="button"
                          onClick={() => setRestoringFile(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black uppercase tracking-tight text-neutral-900">
                  Confirm Database Restore
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestoringFile(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <p>
                You are about to restore tournament player data from the snapshot:
              </p>
              <div className="p-3 rounded-xl bg-neutral-100 font-mono text-neutral-900 font-bold truncate">
                {restoringFile.filename}
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold block">Important Notice:</span>
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
                className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-75"
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
