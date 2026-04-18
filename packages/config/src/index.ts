export const GAME_CONFIG = {
  'black-queen': {
    displayName: 'Black Queen',
    url: process.env.NEXT_PUBLIC_BLACK_QUEEN_URL || 'http://localhost:3002',
    tokenKey: 'bq_token',
    /** Visual identity hints for shell UI — not used by the game app itself. */
    theme: {
      gradient: 'linear-gradient(135deg, #052e16 0%, #064e3b 60%, #065f46 100%)',
      accentColor: '#16a34a',
      symbol: '♛',
      playerRange: '5–10',
    },
  },
  'jack-thief': {
    displayName: 'Jack Thief',
    url: process.env.NEXT_PUBLIC_JACK_THIEF_URL || 'http://localhost:3003',
    tokenKey: 'jt_token',
    /** Visual identity hints for shell UI — not used by the game app itself. */
    theme: {
      gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 60%, #991b1b 100%)',
      accentColor: '#ef4444',
      symbol: '🃏',
      playerRange: '2–13',
    },
  },
} as const;

export type GameType = keyof typeof GAME_CONFIG;
export type GameConfig = typeof GAME_CONFIG[GameType];

export type { GameInfo } from '@cards/types';
