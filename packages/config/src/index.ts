export const GAME_CONFIG = {
  "black-queen": {
    displayName: "Black Queen",
    minPlayers: 5,
    maxPlayers: 10,
    description: "5–10 player trick-taking card game",
    // In production, set NEXT_PUBLIC_BLACK_QUEEN_URL on the shell's Vercel project.
    path: process.env.NEXT_PUBLIC_BLACK_QUEEN_URL || "http://localhost:3002",
  },
} as const;

export type GameType = keyof typeof GAME_CONFIG;
