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

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if a valid token already exists in localStorage
    const stored = getShellToken();
    if (stored && !isTokenExpired(stored)) {
      const payload = decodeToken(stored);
      if (payload) {
        setToken(stored);
        // Coins will be 0 until a real profile fetch is added in a later step.
        // For now, username and id are enough to show the user is logged in.
        setUser({ id: payload.userId, username: payload.username, coins: 0 });
      }
    }
    setLoading(false);
  }, []);

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
