"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface LatestRegistration {
  id: string;
  serial_number: number;
  formatted_serial: string;
  player_name: string;
  village: string;
  playing_role: string;
  phone_number: string;
  photo_url: string;
  poster_url?: string | null;
  poster_status?: string | null;
  created_at?: string;
}

export function getMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export interface DashboardStats {
  total_registered_players: number;
  today_registrations: number;
  total_villages_represented: number;
  latest_registrations: LatestRegistration[];
  players_by_role: Record<string, number>;
  posters_generated: number;
  posters_pending: number;
  posters_failed: number;
  tournament_name: string;
}

export interface PlayerRecord {
  id: string;
  serial_number: number;
  formatted_serial: string;
  player_name: string;
  village: string;
  playing_role: string;
  phone_number: string;
  photo_url: string;
  photo_public_id?: string;
  poster_status: "pending" | "generated" | "failed";
  poster_url?: string | null;
  poster_public_id?: string | null;
  local_poster_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerListResult {
  players: PlayerRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TournamentDetails {
  tournament_name: string;
  organizer: string;
  category: string;
  year: number;
  ground?: string;
  rules?: string | null;
  updated_at?: string;
}

export interface BackupStatus {
  database_name: string;
  backup_directory: string;
  total_backups: number;
  last_backup_time?: string | null;
  players_count: number;
  settings_count: number;
  counters_count: number;
  system_status: string;
}

export interface BackupItem {
  filename: str;
  created_at: string;
  size_bytes: number;
  size_formatted: string;
  player_count: number;
  checksum: string;
}

export interface RestoreResult {
  success: boolean;
  filename: string;
  players_restored: number;
  message: string;
}

type str = string;

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("vfn_admin_token") ||
    localStorage.getItem("sportbid_admin_token")
  );
}

export function setAdminToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("vfn_admin_token", token);
  }
}

export function removeAdminToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vfn_admin_token");
    localStorage.removeItem("sportbid_admin_token");
  }
}

export async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    removeAdminToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
      window.location.href = "/admin/login?expired=true";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    let errorDetail = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export async function loginAdmin(usernameOrEmail: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameOrEmail,
      email: usernameOrEmail,
      password,
    }),
    credentials: "include",
  });

  if (!res.ok) {
    let errMessage = "Invalid credentials";
    try {
      const data = await res.json();
      if (data.detail) errMessage = data.detail;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  const data = await res.json();
  if (data.access_token) {
    setAdminToken(data.access_token);
  }
  return data;
}

export async function logoutAdmin() {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  } finally {
    removeAdminToken();
  }
}

export async function getAdminMe(): Promise<AdminUser> {
  return adminFetch<AdminUser>("/api/v1/auth/me");
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return adminFetch<DashboardStats>("/api/v1/dashboard/stats");
}

export async function fetchPlayersList(params: {
  q?: string;
  village?: string;
  role?: string;
  poster_status?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}): Promise<PlayerListResult> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.village) query.set("village", params.village);
  if (params.role) query.set("role", params.role);
  if (params.poster_status) query.set("poster_status", params.poster_status);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.page) query.set("page", params.page.toString());
  if (params.page_size) query.set("page_size", params.page_size.toString());

  return adminFetch<PlayerListResult>(`/api/v1/players?${query.toString()}`);
}

export async function updatePlayerRecord(
  playerId: string,
  data: Partial<{
    player_name: string;
    village: string;
    playing_role: string;
    phone_number: string;
    poster_status: string;
  }>
): Promise<PlayerRecord> {
  return adminFetch<PlayerRecord>(`/api/v1/players/${playerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePlayerRecord(playerId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch<{ success: boolean; message: string }>(`/api/v1/players/${playerId}`, {
    method: "DELETE",
  });
}

export async function fetchTournamentSettings(): Promise<TournamentDetails> {
  return adminFetch<TournamentDetails>("/api/v1/tournament");
}

export async function updateTournamentSettings(
  data: Partial<TournamentDetails>
): Promise<TournamentDetails> {
  return adminFetch<TournamentDetails>("/api/v1/tournament", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Backup & Recovery API
export async function fetchBackupStatus(): Promise<BackupStatus> {
  return adminFetch<BackupStatus>("/api/v1/backup/status");
}

export async function fetchBackupHistory(): Promise<BackupItem[]> {
  return adminFetch<BackupItem[]>("/api/v1/backup/history");
}

export async function createDatabaseBackup(): Promise<BackupItem> {
  return adminFetch<BackupItem>("/api/v1/backup/create", {
    method: "POST",
  });
}

export function getBackupDownloadUrl(filename: string): string {
  const token = getAdminToken();
  return `${API_BASE_URL}/api/v1/backup/download/${encodeURIComponent(filename)}${token ? `?token=${token}` : ""}`;
}

export async function restoreDatabaseBackup(filename: string): Promise<RestoreResult> {
  return adminFetch<RestoreResult>(`/api/v1/backup/restore/${encodeURIComponent(filename)}`, {
    method: "POST",
  });
}

// Poster Generation & Download API
export function getPlayerPosterUrl(playerId: string, download = false): string {
  const token = getAdminToken();
  const base = `${API_BASE_URL}/api/v1/players/${playerId}/poster`;
  const params = new URLSearchParams();
  if (download) params.set("download", "true");
  if (token) params.set("token", token);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export async function regeneratePlayerPoster(playerId: string): Promise<PlayerRecord> {
  return adminFetch<PlayerRecord>(`/api/v1/players/${playerId}/poster/generate`, {
    method: "POST",
  });
}

export interface PosterAuditResult {
  total_players: number;
  healthy_posters: number;
  missing_or_failed_posters: number;
  missing_photos: number;
  healthy: Array<{
    id: string;
    serial_number: number;
    formatted_serial: string;
    player_name: string;
    poster_url: string;
  }>;
  missing_or_failed: Array<{
    id: string;
    serial_number: number;
    formatted_serial: string;
    player_name: string;
    poster_url: string | null;
    poster_status: string;
    has_photo: boolean;
  }>;
}

export async function fetchPostersAudit(): Promise<PosterAuditResult> {
  return adminFetch<PosterAuditResult>("/api/v1/players/posters/audit");
}

export async function recoverPlayerPoster(playerId: string): Promise<PlayerRecord> {
  return adminFetch<PlayerRecord>(`/api/v1/players/${playerId}/poster/recover`, {
    method: "POST",
  });
}



