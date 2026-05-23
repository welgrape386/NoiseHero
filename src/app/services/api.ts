/**
 * NoiseGuard API Service
 *
 * Frontend: https://noise-on.vercel.app
 * Backend API: https://noisehero.onrender.com
 *
 * 실제 서버 엔드포인트와 통신하는 모든 API 함수를 이 파일에서 관리합니다.
 */

/// <reference types="vite/client" />

export const BASE_URL =
  import.meta.env.VITE_API_URL || 'https://noisehero.onrender.com';

// ─── Token Helpers ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('noise_token');
}

export function setToken(token: string) {
  localStorage.setItem('noise_token', token);
}

export function clearAuth() {
  localStorage.removeItem('noise_token');
  localStorage.removeItem('noise_user');
}

function jsonHeaders(auth = false): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  return h;
}

/** API 오류를 처리하고, 서버 detail 메시지를 추출합니다 */
async function handleResponse<T>(res: Response): Promise<T> {
  let data: unknown = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data
      ? (data as { detail?: unknown }).detail
      : null;

    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((d) =>
                typeof d === 'object' && d !== null && 'msg' in d
                  ? String((d as { msg: unknown }).msg)
                  : String(d)
              )
              .join(', ')
          : '요청에 실패했습니다.';

    throw new Error(msg);
  }

  return data as T;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname?: string;
  apartment_name?: string;
  dong?: string;
  ho?: string;
  floor?: number;
}

export interface UserInfo {
  message: string;
  email: string;
  nickname: string;
  apartment_name: string;
  dong: string;
  ho: string;
  floor: number;

  building_company?: string;
  slab_thickness?: string;
  structure?: string;
  committee?: string;
  management_office?: string;
  management_phone?: string;
}

// ─── Noise Types ────────────────────────────────────────────────────────────

export interface NoiseRecord {
  _id: string;
  email: string;
  leq: number;
  lmax: number;
  noise_type: string;
  primary_source?: string;
  secondary_source?: string;
  time_zone: string;
  leq_standard: number;
  lmax_standard: number | null;
  is_exceeded: boolean;
  measured_at: string;
}

// ─── Auth API ───────────────────────────────────────────────────────────────

/** POST /auth/signup */
export async function apiSignup(
  body: SignupRequest
): Promise<{ message: string; email: string }> {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse<{ message: string; email: string }>(res);
}

/** POST /auth/login */
export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse<LoginResponse>(res);

  if (data.access_token) {
    setToken(data.access_token);
  }

  return data;
}

/** GET /auth/me */
export async function apiGetMe(): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: jsonHeaders(true),
  });

  return handleResponse<UserInfo>(res);
}

/** PATCH /auth/me */
export async function apiUpdateMe(body: {
  nickname?: string;
  apartment_name?: string;
  dong?: string;
  ho?: string;
  floor?: number;
  building_company?: string;
  slab_thickness?: string;
  structure?: string;
  committee?: string;
  management_office?: string;
  management_phone?: string;
}): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: jsonHeaders(true),
    body: JSON.stringify(body),
  });

  return handleResponse<UserInfo>(res);
}

// ─── Noise API ──────────────────────────────────────────────────────────────

/** POST /noise/measure */
export async function apiSaveMeasure(
  leq: number,
  lmax: number,
  noise_type: '직접충격' | '공기전달',
  primary_source = '미분류',
  secondary_source = '없음'
): Promise<NoiseRecord> {
  const res = await fetch(`${BASE_URL}/noise/measure`, {
    method: 'POST',
    headers: jsonHeaders(true),
    body: JSON.stringify({
      leq,
      lmax,
      noise_type,
      primary_source,
      secondary_source,
    }),
  });

  const data = await handleResponse<{
    message: string;
    record: NoiseRecord;
  }>(res);

  return data.record;
}

/** GET /noise/history */
export async function apiGetHistory(): Promise<NoiseRecord[]> {
  const res = await fetch(`${BASE_URL}/noise/history`, {
    method: 'GET',
    headers: jsonHeaders(true),
  });

  const data = await handleResponse<{ history: NoiseRecord[] }>(res);

  return data.history;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const LEGAL_STANDARDS = {
  impact: {
    daytime: { leq: 39, lmax: 57 },
    nighttime: { leq: 34, lmax: 52 },
  },
  airborne: {
    daytime: { leq: 45, lmax: null },
    nighttime: { leq: 40, lmax: null },
  },
} as const;

export function isNighttime(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

export function formatMeasuredAt(isoStr: string): string {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  return `${month}/${day} ${hh}:${mm}`;
}

export interface HistoryItem {
  id: string;
  time: string;
  db: number;
  lmax: number;
  type: string;
  period: string;
  over: boolean;
  leq_standard: number;
  lmax_standard: number | null;
  primary_source?: string;
  secondary_source?: string;
}

export function mapRecord(r: NoiseRecord): HistoryItem {
  return {
    id: r._id,
    time: formatMeasuredAt(r.measured_at),
    db: r.leq,
    lmax: r.lmax,
    type: r.noise_type,
    period: r.time_zone,
    over: r.is_exceeded,
    leq_standard: r.leq_standard,
    lmax_standard: r.lmax_standard,
    primary_source: r.primary_source,
    secondary_source: r.secondary_source,
  };
}