const API_BASE_URL = 'https://noisehero.onrender.com';

const TOKEN_KEY = 'noise_token';
const USER_KEY = 'noise_user';

export type LoginResponse = {
  message: string;
  access_token: string;
  token_type: string;
};

export type UserMe = {
  message?: string;
  email: string;
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
};

export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
  apartment_name?: string;
  dong?: string;
  ho?: string;
  floor?: number;
};

export type UserUpdateRequest = Partial<{
  nickname: string;
  apartment_name: string;
  dong: string;
  ho: string;
  floor: number;

  building_company: string;
  slab_thickness: string;
  structure: string;
  committee: string;
  management_office: string;
  management_phone: string;
}>;

export type NoiseType = '직접충격' | '공기전달';

export type NoiseMeasureRequest = {
  leq: number;
  lmax: number;
  noise_type: NoiseType;
  primary_source?: string;
  secondary_source?: string;
};

export type NoiseRecord = {
  _id: string;
  email?: string;
  leq: number;
  lmax: number;
  noise_type: string;
  primary_source?: string;
  secondary_source?: string;
  time_zone: string;
  leq_standard: number;
  lmax_standard?: number | null;
  is_exceeded: boolean;
  measured_at: string;
};

export type HistoryItem = {
  id: string;
  db: number;
  lmax: number;
  type: string;
  period: string;
  time: string;
  over: boolean;
  leq_standard?: number;
  lmax_standard?: number | null;
  primary_source?: string;
  secondary_source?: string;
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.error ||
      data?.message ||
      `API 요청 실패 (${res.status})`;

    throw new Error(message);
  }

  return data as T;
}

export async function apiSignup(payload: SignupRequest) {
  return request<{ message: string; email: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe() {
  return request<UserMe>('/auth/me');
}

export async function apiUpdateMe(payload: UserUpdateRequest) {
  const res = await request<{
    message: string;
    updated_fields: UserUpdateRequest;
  }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return {
    ...payload,
    ...res.updated_fields,
  };
}

export async function apiCreateMeasure(payload: NoiseMeasureRequest) {
  return request<{ message: string; record: NoiseRecord }>('/noise/measure', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiSaveMeasure(data: {
  measure_type?: string;
  value?: number;
  leq?: number;
  lmax?: number;
  measured_at?: string;
  is_violation?: boolean;
  memo?: string;
  noise_type?: NoiseType;
  primary_source?: string;
  secondary_source?: string;
}) {
  return request<{ message: string; record: NoiseRecord }>('/noise/measure', {
    method: 'POST',
    body: JSON.stringify({
      leq: data.leq ?? data.value ?? 0,
      lmax: data.lmax ?? data.value ?? 0,
      noise_type:
        data.noise_type ??
        (data.measure_type === 'airborne' ? '공기전달' : '직접충격'),
      primary_source: data.primary_source,
      secondary_source: data.secondary_source,
    }),
  });
}

export async function apiGetHistory() {
  const res = await request<{ history: NoiseRecord[] }>('/noise/history');
  return res.history || [];
}

export function mapRecord(record: NoiseRecord): HistoryItem {
  return {
    id: record._id,
    db: record.leq,
    lmax: record.lmax,
    type: record.noise_type,
    period: record.time_zone,
    time: formatDateTime(record.measured_at),
    over: record.is_exceeded,
    leq_standard: record.leq_standard,
    lmax_standard: record.lmax_standard,
    primary_source: record.primary_source,
    secondary_source: record.secondary_source,
  };
}

export function isNighttime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

function formatDateTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const LEGAL_STANDARDS = {
  공동주택: {
    직접충격: {
      주간: { leq: 39, lmax: 57 },
      야간: { leq: 34, lmax: 52 },
    },
    공기전달: {
      주간: { leq: 45, lmax: 57 },
      야간: { leq: 40, lmax: 52 },
    },
  },
};