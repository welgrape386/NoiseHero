/**
 * NoiseGuard API Service
 * Base URL: http://127.0.0.1:8000
 *
 * 실제 서버 엔드포인트와 통신하는 모든 API 함수를 이 파일에서 관리합니다.
 *
 * 개발 모드: localStorage에 'dev_mode=true' 설정 시 서버 없이 작동
 */

// 환경에 따라 API URL 자동 전환
export const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:8000'  // 로컬 개발
    : 'https://your-api.vercel.app');  // 프로덕션

// 개발 모드 확인
export function isDevMode(): boolean {
  return localStorage.getItem('dev_mode') === 'true';
}

export function setDevMode(enabled: boolean) {
  if (enabled) {
    localStorage.setItem('dev_mode', 'true');
  } else {
    localStorage.removeItem('dev_mode');
  }
}

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
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

/** API 오류를 처리하고, 서버 detail 메시지를 추출합니다 */
async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    // FastAPI는 주로 { detail: "..." } 형식으로 오류를 반환
    const msg =
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
        ? data.detail.map((d: { msg: string }) => d.msg).join(', ')
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
}

// ─── Noise Types ─────────────────────────────────────────────────────────────

export interface NoiseRecord {
  _id: string;
  email: string;
  leq: number;
  lmax: number;
  noise_type: string;       // '직접충격' | '공기전달'
  time_zone: string;        // '주간' | '야간'
  leq_standard: number;
  lmax_standard: number;    // 공기전달은 0 (미적용)
  is_exceeded: boolean;
  measured_at: string;      // ISO 8601
}

// ─── Auth API ────────────────────────────────────────────────────────────────

/** POST /auth/login */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  // 개발 모드
  if (isDevMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (email && password.length >= 6) {
      return {
        message: '로그인 성공',
        access_token: 'dev_mock_token_' + Date.now(),
        token_type: 'bearer',
      };
    }
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // 실제 API 호출
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<LoginResponse>(res);
  } catch (err) {
    console.error('API 호출 실패:', err);
    throw new Error('서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해주세요.');
  }
}

/** POST /auth/signup */
export async function apiSignup(body: SignupRequest): Promise<{ message: string; email: string }> {
  // 개발 모드
  if (isDevMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const existingUser = localStorage.getItem('dev_user_' + body.email);
    if (existingUser) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }
    localStorage.setItem('dev_user_' + body.email, JSON.stringify(body));
    return { message: '회원가입 성공', email: body.email };
  }

  // 실제 API 호출
  try {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  } catch (err) {
    console.error('API 호출 실패:', err);
    throw new Error('서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해주세요.');
  }
}

/** GET /auth/me — 내 정보 조회 */
export async function apiGetMe(): Promise<UserInfo> {
  // 개발 모드
  if (isDevMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = localStorage.getItem('noise_user');
    if (user) {
      const parsed = JSON.parse(user);
      return {
        message: '사용자 정보 조회 성공',
        email: parsed.email || 'dev@example.com',
        nickname: parsed.nickname || '개발자',
        apartment_name: parsed.apartment_name || '테스트 아파트',
        dong: parsed.dong || '101',
        ho: parsed.ho || '101',
        floor: parsed.floor || 1,
      };
    }
    throw new Error('인증 정보가 없습니다.');
  }

  // 실제 API 호출
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(true),
  });
  return handleResponse<UserInfo>(res);
}

// ─── Noise API ───────────────────────────────────────────────────────────────

/** POST /noise/measure — 측정 데이터 저장 */
export async function apiSaveMeasure(
  leq: number,
  lmax: number,
  noise_type: '직접충격' | '공기전달'
): Promise<NoiseRecord> {
  // 개발 모드
  if (isDevMode()) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const night = isNighttime();
    const time_zone = night ? '야간' : '주간';
    const zone = night ? 'nighttime' : 'daytime';
    const std = LEGAL_STANDARDS[noise_type === '직접충격' ? 'impact' : 'airborne'][zone];

    const record: NoiseRecord = {
      _id: 'dev_' + Date.now(),
      email: JSON.parse(localStorage.getItem('noise_user') || '{}').email || 'dev@example.com',
      leq,
      lmax,
      noise_type,
      time_zone,
      leq_standard: std.leq,
      lmax_standard: std.lmax || 0,
      is_exceeded: leq > std.leq || (std.lmax !== null && lmax > std.lmax),
      measured_at: new Date().toISOString(),
    };

    // localStorage에 저장
    const history = JSON.parse(localStorage.getItem('dev_noise_history') || '[]');
    history.unshift(record);
    localStorage.setItem('dev_noise_history', JSON.stringify(history.slice(0, 100)));

    return record;
  }

  // 실제 API 호출
  const res = await fetch(`${BASE_URL}/noise/measure`, {
    method: 'POST',
    headers: jsonHeaders(true),
    body: JSON.stringify({ leq, lmax, noise_type }),
  });
  const data = await handleResponse<{ message: string; record: NoiseRecord }>(res);
  return data.record;
}

/** GET /noise/history — 측정 이력 조회 */
export async function apiGetHistory(): Promise<NoiseRecord[]> {
  // 개발 모드
  if (isDevMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const history = JSON.parse(localStorage.getItem('dev_noise_history') || '[]');
    return history;
  }

  // 실제 API 호출
  const res = await fetch(`${BASE_URL}/noise/history`, {
    headers: jsonHeaders(true),
  });
  const data = await handleResponse<{ history: NoiseRecord[] }>(res);
  return data.history;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 법적 기준 — API 명세 기반 */
export const LEGAL_STANDARDS = {
  impact: {
    daytime:  { leq: 39, lmax: 57 },
    nighttime: { leq: 34, lmax: 52 },
  },
  airborne: {
    daytime:  { leq: 45, lmax: null },
    nighttime: { leq: 40, lmax: null },
  },
} as const;

/** 현재 시간이 야간(22시~06시)인지 판별 */
export function isNighttime(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

/** ISO 날짜를 한국 형식으로 포맷 (예: 5/7 23:14) */
export function formatMeasuredAt(isoStr: string): string {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hh}:${mm}`;
}

/** NoiseRecord → 화면에서 사용하는 HistoryItem으로 변환 */
export interface HistoryItem {
  id: string;
  time: string;
  db: number;
  lmax: number;
  type: string;
  period: string;
  over: boolean;
  leq_standard: number;
  lmax_standard: number;
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
  };
}
