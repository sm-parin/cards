/**
 * Application-level configuration constants.
 *
 * Environment-specific values should be sourced from `.env` files.
 * This file provides typed, centralised access.
 */
export const appConfig = {
  /** Public display name of the application */
  appName: "Black Queen",

  /** Backend WebSocket URL — override via NEXT_PUBLIC_SOCKET_URL */
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000",

  /** Default locale */
  defaultLocale: "en" as const,
} as const;
