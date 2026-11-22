import { getToken } from '../utils/tokenStorage';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Called with the backend message on every 401 (except sign-in), e.g. "signed out because ... another device". */
let onUnauthorized: ((message: string) => void) | null = null;
export function setUnauthorizedHandler(fn: ((message: string) => void) | null) { onUnauthorized = fn; }

/** Builds "?a=1&b=x" from the defined, non-empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, String(v).trim());
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function request<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.message) || 'Something went wrong. Please try again.';
    if (res.status === 401 && onUnauthorized && !path.startsWith('/auth/login')) onUnauthorized(msg);
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
