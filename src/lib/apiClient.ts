/**
 * Thin API client for the Student Portal.
 *
 * Each business domain is owned by a specific backend, targeted via a per-domain
 * base URL so ownership boundaries are explicit:
 *   - studentApi     → Student Portal backend (auth, profile, me/*, notifications)
 *   - tecApi         → TEC Cell backend (advertisements, applications, documents)
 *   - coordinatorApi → Coordinator backend (attendance form)
 *
 * TEC and Coordinator URLs are REQUIRED (no silent fallback): a call to an
 * unconfigured backend fails fast with a clear error instead of silently hitting
 * the Student origin. No business logic lives here — request in, data out.
 */
const STUDENT_API =
  (import.meta.env.VITE_STUDENT_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:5002/api';
const TEC_API = import.meta.env.VITE_TEC_API_URL as string | undefined;
const COORDINATOR_API = import.meta.env.VITE_COORDINATOR_API_URL as string | undefined;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string; // some backends (TEC) also send `message`
}

function errorText<T>(json: ApiEnvelope<T>, status: number): string {
  return json.error || json.message || `Request failed (${status})`;
}

/**
 * Cross-portal auth token. The Student backend returns the access token on
 * login / register / refresh; we attach it as `Authorization: Bearer` on every
 * request so cross-host calls to the TEC and Coordinator backends authenticate
 * even when the portals run on different machines (where cookies cannot be
 * shared). Cookies still flow (credentials: 'include') for the same-host path,
 * so nothing changes for a single-machine setup.
 */
const TOKEN_KEY = 'student_access_token';
let accessToken: string | null = readStoredToken();

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable — keep token in memory only
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// Single-flight token refresh: on a 401 we hit the Student backend's cookie-based
// /auth/refresh (always same-host as the SPA) once, store the new token, retry.
let refreshInFlight: Promise<boolean> | null = null;
function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${STUDENT_API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
        });
        if (!res.ok) return false;
        const j = (await res.json().catch(() => null)) as ApiEnvelope<{ token?: string }> | null;
        if (j?.data?.token) {
          setAccessToken(j.data.token);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  base: string,
  path: string,
  method: Method,
  body?: unknown,
  retry = true,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && retry && accessToken) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(base, path, method, body, false);
  }

  let json: ApiEnvelope<T> = { success: false };
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // non-JSON response
  }

  if (!res.ok || json.success === false) {
    throw new Error(errorText(json, res.status));
  }
  return json.data as T;
}

async function requestBlob(base: string, path: string, retry = true): Promise<Blob> {
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });

  if (res.status === 401 && retry && accessToken) {
    const ok = await refreshAccessToken();
    if (ok) return requestBlob(base, path, false);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as ApiEnvelope<unknown>;
      message = errorText(j, res.status);
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.blob();
}

function client(base: string | undefined, name: string, envVar: string) {
  const resolve = () => {
    if (!base) throw new Error(`${name} backend URL is not configured — set ${envVar}.`);
    return base;
  };
  return {
    get: <T>(path: string) => request<T>(resolve(), path, 'GET'),
    post: <T>(path: string, body?: unknown) => request<T>(resolve(), path, 'POST', body),
    patch: <T>(path: string, body?: unknown) => request<T>(resolve(), path, 'PATCH', body),
    del: <T>(path: string) => request<T>(resolve(), path, 'DELETE'),
    // Fetches a binary payload (e.g. a generated PDF) instead of the JSON envelope.
    blob: (path: string) => requestBlob(resolve(), path),
  };
}

export const studentApi = client(STUDENT_API, 'Student', 'VITE_STUDENT_API_URL');
export const tecApi = client(TEC_API, 'TEC', 'VITE_TEC_API_URL');
export const coordinatorApi = client(COORDINATOR_API, 'Coordinator', 'VITE_COORDINATOR_API_URL');

// Back-compat default (Student backend) — used by authService.
export const api = studentApi;
