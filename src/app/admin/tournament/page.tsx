"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Save, RefreshCw, CheckCircle2, AlertCircle, MapPin, Calendar, Users, FileText } from "lucide-react";
import { fetchTournamentSettings, updateTournamentSettings, TournamentDetails } from "@/lib/adminApi";

export default function TournamentSettingsPage() {
  const [settingsData, setSettingsData] = useState<TournamentDetails>({
    tournament_name: "Volleyball Friends Nalthur Trophy 2026",
    organizer: "Volleyball Friends Nalthur",
    category: "Volleyball",
    year: 2026,
    ground: "Nalthur Ground",
    rules: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTournamentSettings();
      setSettingsData(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load tournament settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const updated = await updateTournamentSettings(settingsData);
      setSettingsData(updated);
      setSuccessToast("Tournament details updated successfully in database.");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save tournament details.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400/70">
          Loading Tournament Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {successToast && (
        <div className="p-4 rounded-2xl bg-amber-950/40 text-amber-200 text-xs font-bold shadow-xl border border-amber-500/40 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-[#0d1217] rounded-3xl border border-amber-500/25 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                Tournament Configuration
              </h2>
              <p className="text-xs text-neutral-400">
                These settings are stored in MongoDB and used for auction posters and tournament identity.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSettings}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Reload settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Tournament Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="tournament_name"
              className="font-bold text-neutral-300 uppercase tracking-wider block"
            >
              Tournament Name *
            </label>
            <div className="relative rounded-xl">
              <input
                id="tournament_name"
                type="text"
                required
                value={settingsData.tournament_name}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, tournament_name: e.target.value })
                }
                className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Organizer & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="organizer"
                className="font-bold text-neutral-300 uppercase tracking-wider block"
              >
                Organizer / Committee *
              </label>
              <div className="relative rounded-xl">
                <input
                  id="organizer"
                  type="text"
                  required
                  value={settingsData.organizer}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, organizer: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="font-bold text-neutral-300 uppercase tracking-wider block"
              >
                Sport Category *
              </label>
              <div className="relative rounded-xl">
                <input
                  id="category"
                  type="text"
                  required
                  value={settingsData.category}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Year & Ground */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="year"
                className="font-bold text-neutral-300 uppercase tracking-wider block"
              >
                Tournament Year *
              </label>
              <input
                id="year"
                type="number"
                required
                min={2024}
                max={2100}
                value={settingsData.year}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, year: parseInt(e.target.value) || 2026 })
                }
                className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ground"
                className="font-bold text-neutral-300 uppercase tracking-wider block"
              >
                Tournament Ground / Venue
              </label>
              <input
                id="ground"
                type="text"
                value={settingsData.ground || ""}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, ground: e.target.value })
                }
                placeholder="e.g. Nalthur Ground"
                className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Rules / Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="rules"
              className="font-bold text-neutral-300 uppercase tracking-wider block"
            >
              Tournament Guidelines & Rules Note
            </label>
            <textarea
              id="rules"
              rows={4}
              value={settingsData.rules || ""}
              onChange={(e) =>
                setSettingsData({ ...settingsData, rules: e.target.value })
              }
              placeholder="e.g., Standard volleyball federation rules apply. Rotation compulsory. 3 sets of 25 points."
              className="w-full rounded-xl border border-neutral-700/80 bg-[#080b0f] p-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-colors leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-slate-950 font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Changes..." : "Save Tournament Details"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
