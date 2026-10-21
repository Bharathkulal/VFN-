"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface DashboardStats {
  total_registered_players: number;
  today_registrations: number;
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

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sportbid_admin_token");
}

export function setAdminToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("sportbid_admin_token", token);
  }
}

export function removeAdminToken() {
  if (typeof window !== "undefined") {
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

export async function loginAdmin(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
