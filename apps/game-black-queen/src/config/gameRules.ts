/**
 * Game rules and constants.
 *
 * Mirrors `blackqueen-backend/src/config/constants.js`.
 * Used for UI logic (e.g. enabling Start Game at min player threshold).
 */
export const GAME_RULES = {
  MIN_PLAYERS_TO_START: 5,
  DEFAULT_MAX_PLAYERS: 5,
} as const;

export const BID_RULES = {
  1: { minBid: 60, maxBid: 150, increment: 5 },
  2: { minBid: 120, maxBid: 300, increment: 5 },
} as const;

export const SUITS = ["♥", "♣", "♦", "♠"] as const;

/** All valid card face values in ascending order */
export const CARD_VALUES = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A",
] as const;

export type CardValue = (typeof CARD_VALUES)[number];
