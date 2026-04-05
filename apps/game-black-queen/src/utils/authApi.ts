/**
 * HTTP API helpers for authentication.
 *
 * Calls the server's REST auth endpoints and manages the JWT in localStorage
 * via the token helpers from socketEmitter.
 *
 * @module utils/authApi
 */

import { setToken, clearToken } from "@/utils/socketEmitter";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    coins: number;
  };
}

/**
 * Registers a new account and stores the returned JWT.
 * @param username - Desired username
 * @param password - Plain-text password (hashed server-side)
 */
export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Registration failed");
  }

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

/**
 * Authenticates an existing account and stores the returned JWT.
 * @param username - Username
 * @param password - Plain-text password
 */
export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Login failed");
  }

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

/** Logs out the current user by clearing the stored JWT. */
export function logout(): void {
  clearToken();
}
