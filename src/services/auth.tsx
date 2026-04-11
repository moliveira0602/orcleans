import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem('orca_user');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveSession(user: User) {
  localStorage.setItem('orca_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('orca_user');
  localStorage.removeItem('orcalens_auth');
  localStorage.removeItem('orcalens_auth_users');
  localStorage.removeItem('orca_session');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (api.isAuthenticated() && !user) {
      api.get<any>('/auth/me')
        .then((profile) => {
          const userData: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            organizationId: profile.organization.id,
            organizationName: profile.organization.name,
          };
          setUser(userData);
          saveSession(userData);
        })
        .catch(() => {
          api.logout();
          clearSession();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<any>('/auth/login', { email, password });
    api.setTokens(result.accessToken, result.refreshToken);
    const userData: User = result.user;
    setUser(userData);
    saveSession(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, organizationName: string) => {
    const result = await api.post<any>('/auth/register', { name, email, password, organizationName });
    api.setTokens(result.accessToken, result.refreshToken);
    const userData: User = result.user;
    setUser(userData);
    saveSession(userData);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    clearSession();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.get<any>('/auth/me');
      const userData: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        organizationId: profile.organization.id,
        organizationName: profile.organization.name,
      };
      setUser(userData);
      saveSession(userData);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
