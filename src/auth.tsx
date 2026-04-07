import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface User {
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'orcalens_auth';

function loadSession(): User | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function hashPassword(password: string): string {
    // Simple hash for demo - in production use a proper crypto library
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString(36);
}

function getStoredUsers(): Record<string, { name: string; email: string; passwordHash: string }> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY + '_users');
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveUsers(users: Record<string, { name: string; email: string; passwordHash: string }>) {
    localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(loadSession);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        const users = getStoredUsers();
        const found = users[email.toLowerCase()];
        if (found && found.passwordHash === hashPassword(password)) {
            const session: User = { name: found.name, email: found.email };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            setUser(session);
            return true;
        }
        return false;
    }, []);

    const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
        const users = getStoredUsers();
        const key = email.toLowerCase();
        if (users[key]) return false; // already exists
        users[key] = { name, email: key, passwordHash: hashPassword(password) };
        saveUsers(users);
        const session: User = { name, email: key };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setUser(session);
        return true;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
