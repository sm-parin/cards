export const GAME_CONFIG = {
  'black-queen': {
    displayName: 'Black Queen',
    url: process.env.NEXT_PUBLIC_BLACK_QUEEN_URL || 'http://localhost:3002',
    tokenKey: 'bq_token',
  },
  'jack-thief': {
    displayName: 'Jack Thief',
    url: process.env.NEXT_PUBLIC_JACK_THIEF_URL || 'http://localhost:3003',
    tokenKey: 'jt_token',
  },
} as const;

export type GameType = keyof typeof GAME_CONFIG;
export type GameConfig = typeof GAME_CONFIG[GameType];

/**
 * Full game metadata returned by each game app's GET /api/game-info endpoint.
 * All game-specific data (rules, player counts, description) lives in the game app only.
 */
export interface GameInfo {
  displayName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  rules: Array<{ title: string; content: string }>;
}
