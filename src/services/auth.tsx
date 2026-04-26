import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { api } from '../services/api';
import { useAppDispatch } from '../store';

type Role = 'super_admin' | 'admin' | 'member';

interface Organization {
  id: string;
  name: string;
  plan: string;
  maxLeads: number;
  leadsConsumed: number;
  maxUsers: number;
  trialExpiresAt?: string;
  lastBillingDate?: string;
  stripeId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  organization?: Organization;
}

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

function isSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN;
}

function isAdmin(role: Role): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
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
  localStorage.removeItem('orca_settings');
  localStorage.removeItem('orca_onboarding_done');
  localStorage.removeItem('orca_google_api_key');
  localStorage.removeItem('orca_scan_demo');
  localStorage.removeItem('orca_scan_source');
  sessionStorage.removeItem('orca_api_calls_today');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSession);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // CRITICAL: Always validate session with server on page load.
    // We CANNOT trust localStorage alone because the stored 'orca_user'
    // might belong to a DIFFERENT user than the current JWT token.
    // For example: Marcos logs in, then Michelle logs in on the same browser.
    // After Michelle's token expires and refreshes, the old 'orca_user' (Marcos)
    // could pollute the session. Fix: always validate against /auth/me.
    if (api.isAuthenticated()) {
      api.get<any>('/auth/me')
        .then((profile) => {
          const userData: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            organizationId: profile.organization.id,
            organizationName: profile.organization.name,
            organization: profile.organization,
          };
          setUser(userData);
          setOrganization(profile.organization);
          saveSession(userData);
          // Sync profile to app settings
          dispatch({ type: 'UPDATE_SETTINGS', payload: { name: profile.name, email: profile.email, company: profile.company || '' } });
        })
        .catch(() => {
          // Token is invalid or expired - clear everything
          api.logout();
          clearSession();
          setUser(null);
          setOrganization(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      // No token at all - clear stale user data that might be from a previous user
      clearSession();
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
    }
  }, []);

  // Global heartbeat - updates lastSeenAt every 60s
  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = async () => {
      try {
        await api.post(`/admin/users/${user.id}/heartbeat`);
      } catch {
        // ignore - session may have expired
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 60 seconds
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    // Clear any previous user's data BEFORE setting new tokens
    clearSession();
    const result = await api.post<any>('/auth/login', { email, password });
    api.setTokens(result.accessToken, result.refreshToken);
    const userData: User = result.user;
    setUser(userData);
    setOrganization(result.user.organization || null);
    saveSession(userData);
    // Sync profile to app settings
    dispatch({ type: 'UPDATE_SETTINGS', payload: { name: result.user.name, email: result.user.email, company: result.user.company || '' } });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, organizationName: string) => {
    clearSession();
    const result = await api.post<any>('/auth/register', { name, email, password, organizationName });
    api.setTokens(result.accessToken, result.refreshToken);
    const userData: User = result.user;
    setUser(userData);
    setOrganization(result.user.organization || null);
    saveSession(userData);
    // Sync profile to app settings
    dispatch({ type: 'UPDATE_SETTINGS', payload: { name: result.user.name, email: result.user.email, company: result.user.company || '' } });
  }, []);

  const logout = useCallback(() => {
    api.logout();
    clearSession();
    setUser(null);
    setOrganization(null);
    // Clear settings on logout
    dispatch({ type: 'UPDATE_SETTINGS', payload: { name: '', email: '', company: '' } });
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.delete('/auth/delete-account');
    clearSession();
    setUser(null);
    setOrganization(null);
    dispatch({ type: 'CLEAR_ALL' });
    dispatch({ type: 'UPDATE_SETTINGS', payload: { name: '', email: '', company: '' } });
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
        organization: profile.organization,
      };
      setUser(userData);
      setOrganization(profile.organization);
      saveSession(userData);
      // Sync profile to app settings
      dispatch({ type: 'UPDATE_SETTINGS', payload: { name: profile.name, email: profile.email, company: profile.company || '' } });
    } catch (err: any) {
      console.error('[Auth] refreshProfile failed:', err.message || err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isLoading,
      isSuperAdmin: isSuperAdmin(user?.role as Role),
      isAdmin: isAdmin(user?.role as Role),
      login,
      register,
      logout,
      deleteAccount,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ROLES, isSuperAdmin, isAdmin };
export type { Role };
