import { getToken } from './socketEmitter';

interface TokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT payload without verifying signature.
 * Signature is verified by the server on every request.
 * This is safe — we only use this for display data (username, userId).
 */
export function decodeToken(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const payload = decodeToken();
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}
