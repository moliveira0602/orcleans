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

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h |= 0;
  }
  return h.toString(36);
}

function getLocalUsers(): Array<{ id: string; name: string; email: string; passwordHash: string; role: string; organizationId: string; organizationName: string }> {
  try {
    const raw = localStorage.getItem('orcalens_auth_users');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLocalUsers(users: Array<{ id: string; name: string; email: string; passwordHash: string; role: string; organizationId: string; organizationName: string }>) {
  localStorage.setItem('orcalens_auth_users', JSON.stringify(users));
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
    try {
      const result = await api.post<any>('/auth/login', { email, password });
      api.setTokens(result.accessToken, result.refreshToken);
      const userData: User = result.user;
      setUser(userData);
      saveSession(userData);
      return;
    } catch {
      // fallback local
    }

    const users = getLocalUsers();
    const hash = simpleHash(password);
    const found = users.find((u) => u.email === email.toLowerCase() && u.passwordHash === hash);

    if (!found) {
      throw new Error('Email ou senha incorretos.');
    }

    const userData: User = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      organizationId: found.organizationId,
      organizationName: found.organizationName,
    };

    setUser(userData);
    saveSession(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, organizationName: string) => {
    try {
      const result = await api.post<any>('/auth/register', { name, email, password, organizationName });
      api.setTokens(result.accessToken, result.refreshToken);
      const userData: User = result.user;
      setUser(userData);
      saveSession(userData);
      return;
    } catch {
      // fallback local
    }

    const users = getLocalUsers();
    const existing = users.find((u) => u.email === email.toLowerCase());
    if (existing) {
      throw new Error('Este email já está registado.');
    }

    const id = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const newUser = {
      id,
      name,
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
      role: 'admin',
      organizationId: orgId,
      organizationName,
    };

    users.push(newUser);
    saveLocalUsers(users);

    const userData: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      organizationId: newUser.organizationId,
      organizationName: newUser.organizationName,
    };

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
