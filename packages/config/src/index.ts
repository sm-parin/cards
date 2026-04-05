export const GAME_CONFIG = {
  'black-queen': {
    displayName: 'Black Queen',
    minPlayers: 5,
    maxPlayers: 10,
    description: '5–10 player trick-taking card game',
    // The URL the shell redirects to when launching this game.
    // Shell appends ?token=... automatically.
    url: process.env.NEXT_PUBLIC_BLACK_QUEEN_URL || 'http://localhost:3002',
    // The localStorage key the game uses to store its token.
    // Must match what the game reads on startup.
    tokenKey: 'bq_token',
  },
  'jack-thief': {
    displayName: 'Jack Thief',
    minPlayers: 2,
    maxPlayers: 13,
    description: '2–13 player card game — don\'t get caught holding the Jack!',
    url: process.env.NEXT_PUBLIC_JACK_THIEF_URL || 'http://localhost:3003',
    tokenKey: 'jt_token',
  },
} as const;

export type GameType = keyof typeof GAME_CONFIG;
export type GameConfig = typeof GAME_CONFIG[GameType];
