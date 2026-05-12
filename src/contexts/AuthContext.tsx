import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authService } from '@/lib/auth-service';
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from '@/lib/auth-types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.me().then((s) => {
      setSession(s);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const s = await authService.login(payload);
    setSession(s);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const s = await authService.register(payload);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
