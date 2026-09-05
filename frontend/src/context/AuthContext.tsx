import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getAuthToken, setAuthToken } from "../api/client";
import type { AdminProfile, LoginResponse } from "../api/types";

interface AuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.get<AdminProfile>("/auth/me");
        setAdmin(profile);
      } catch {
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResponse>("/auth/login", { email, password });
    setAuthToken(result.token);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setAdmin(null);
  }, []);

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
