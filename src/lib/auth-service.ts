import { apiRequest } from './api-client';
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from './auth-types';

const SESSION_KEY = 'nexusmail.session';

// Map backend Title-Case roles → frontend lowercase-kebab roles
function normalizeRole(backendRole: string): AuthUser['role'] {
  const map: Record<string, AuthUser['role']> = {
    Admin: 'admin',
    Director: 'director',
    Secretary: 'secretary',
    Professor: 'professor',
    'Service Lead': 'service-lead',
  };
  return map[backendRole] ?? ('professor' as AuthUser['role']);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(u: any): AuthUser {
  const name: string = u.name ?? '';
  const dept = u.departmentId;
  return {
    id: u._id as string,
    fullName: name,
    email: u.email as string,
    role: normalizeRole(u.role as string),
    departmentId: typeof dept === 'object' && dept !== null ? (dept._id as string) : (dept as string) ?? '',
    departmentName: typeof dept === 'object' && dept !== null ? (dept.name as string) : '',
    avatarInitials:
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0]?.toUpperCase() ?? '')
        .join('') || 'NX',
    createdAt: u.createdAt as string,
  };
}

function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const data = await apiRequest<{
      data: { user: unknown; accessToken: string; refreshToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });
    const session: AuthSession = {
      user: mapUser(data.data.user),
      tokens: { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken },
    };
    saveSession(session);
    return session;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: 'Professor',
        departmentId: payload.departmentId || null,
      }),
    });
    // Register doesn't return tokens — login immediately after
    return this.login({ email: payload.email, password: payload.password });
  },

  async me(): Promise<AuthSession | null> {
    const session = loadSession();
    if (!session?.tokens?.accessToken) return null;
    try {
      const data = await apiRequest<{ data: { user: unknown } }>('/auth/me');
      const updated: AuthSession = { ...session, user: mapUser(data.data.user) };
      saveSession(updated);
      return updated;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  // Kept for interface compatibility — backend will reject duplicate emails at register time
  async emailExists(_email: string): Promise<boolean> {
    return false;
  },
};
