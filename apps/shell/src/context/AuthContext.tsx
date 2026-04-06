'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getShellToken,
  setShellToken,
  clearShellToken,
  decodeToken,
  isTokenExpired,
  type AuthUser,
} from '@cards/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://localhost:5000';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchFreshUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initFromToken = useCallback(async (stored: string) => {
    if (isTokenExpired(stored)) return;
    const payload = decodeToken(stored);
    if (!payload) return;
    // Optimistically set from JWT so UI shows instantly
    setToken(stored);
    setUser({ id: payload.userId, username: payload.username, email: payload.email, nickname: payload.nickname ?? null, coins: 0 });
    // Then fetch fresh coins from server
    const fresh = await fetchFreshUser(stored);
    if (fresh) setUser(fresh);
  }, []);

  useEffect(() => {
    const stored = getShellToken();
    if (stored) {
      initFromToken(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [initFromToken]);

  // Cross-tab sync — when another tab logs in or out, reflect it here
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== 'cards_token') return;
      if (!e.newValue) {
        setToken(null);
        setUser(null);
      } else {
        initFromToken(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [initFromToken]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setShellToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearShellToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
