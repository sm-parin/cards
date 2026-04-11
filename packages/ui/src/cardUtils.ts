import type { Card, Suit } from '@cards/types';

const SUIT_CHARS = new Set(['♥', '♣', '♦', '♠']);

/** Extracts the suit character from a card string (last char). */
export function getSuit(card: Card): Suit | null {
  const last = card.slice(-1);
  return SUIT_CHARS.has(last) ? (last as Suit) : null;
}

/** Extracts the rank/value from a card string (everything except last char). */
export function getValue(card: Card): string {
  return card.slice(0, -1);
}

/** Alias for getValue — both games use this spelling. */
export const getRank = getValue;

/** Returns true if the card belongs to a red suit (♥ or ♦). */
export function isRed(card: Card): boolean {
  const s = getSuit(card);
  return s === '♥' || s === '♦';
}
