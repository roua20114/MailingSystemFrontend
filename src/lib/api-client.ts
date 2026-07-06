// Central HTTP client — attaches JWT, handles 401 auto-refresh, throws on error.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function getSession(): { tokens?: { accessToken?: string; refreshToken?: string } } | null {
  try {
    const raw = localStorage.getItem('nexusmail.session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: unknown) {
  localStorage.setItem('nexusmail.session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('nexusmail.session');
}

async function refreshTokens(): Promise<string | null> {
  const session = getSession();
  const refreshToken = session?.tokens?.refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      window.location.href = '/login';
      return null;
    }
    const data = await res.json();
    const newSession = { ...session, tokens: { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken } };
    saveSession(newSession);
    return data.data.accessToken;
  } catch {
    clearSession();
    window.location.href = '/login';
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const token = session?.tokens?.accessToken;

  const isFormData = options.body instanceof FormData;

const headers: Record<string, string> = {
  // Don't set Content-Type for FormData — browser sets it automatically with the correct boundary
  ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(options.headers as Record<string, string> ?? {}),
};

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const newToken = await refreshTokens();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders });
    }
  }

  const data = await res.json();
  if (!res.ok) {
    // Surface field-level validation errors (422) as a readable message
    if (res.status === 422 && Array.isArray(data?.errors) && data.errors.length > 0) {
      const details = data.errors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join(' | ');
      throw new Error(`${data.message}: ${details}`);
    }
    throw new Error(data?.message ?? `API error ${res.status}`);
  }
  return data as T;
}