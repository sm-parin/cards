/**
 * Application-level configuration constants.
 */
export const appConfig = {
  appName: "Jack Thief",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000",
  defaultLocale: "en" as const,
} as const;
