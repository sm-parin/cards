const API_URL = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_SERVER_URL
  || 'http://localhost:3001';

export interface AuthUser {
  id: string;
  username: string;
  coins: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

// ─── Token utilities ──────────────────────────────────────────────────────────
// These are used by the SHELL only.
// Games use their own localStorage key (bq_token) received via URL param.

const SHELL_TOKEN_KEY = 'cards_token';

export function getShellToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SHELL_TOKEN_KEY);
}

export function setShellToken(token: string): void {
  localStorage.setItem(SHELL_TOKEN_KEY, token);
}

export function clearShellToken(): void {
  localStorage.removeItem(SHELL_TOKEN_KEY);
}

export interface TokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}
