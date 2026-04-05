/**
 * Card utility functions.
 *
 * Pure helpers for parsing and reasoning about card strings
 * (e.g. "Q♠", "10♥").
 *
 * @module utils/cardUtils
 */

import type { Suit, Card } from "@/types";

const SUIT_CHARS = new Set(["♥", "♣", "♦", "♠"]);

/**
 * Extracts the suit character from a card string.
 * Works for both single-char values ("Q♠") and "10♥".
 *
 * @param card - Card string e.g. "Q♠" or "10♥"
 * @returns The suit character, or null if not found.
 */
export function getSuit(card: Card): Suit | null {
  const last = card.slice(-1);
  return SUIT_CHARS.has(last) ? (last as Suit) : null;
}

/**
 * Extracts the face value from a card string.
 *
 * @param card - Card string e.g. "Q♠" → "Q", "10♥" → "10"
 */
export function getValue(card: Card): string {
  return card.slice(0, -1);
}

/**
 * Returns the set of cards the player is allowed to play.
 *
 * Rules (mirror server-side):
 * - If no suit has been led yet (currentSuit === null) → any card is valid.
 * - If a suit has been led and the player holds cards of that suit
 *   → only those cards are valid (must follow suit).
 * - If the player holds no cards of the led suit → any card is valid (ruff).
 *
 * @param hand         - The player's current hand.
 * @param currentSuit  - The suit of the first card played this stack, or null.
 */
export function getValidCards(hand: Card[], currentSuit: Suit | null): Set<Card> {
  if (currentSuit === null) return new Set(hand);

  const suitCards = hand.filter((c) => getSuit(c) === currentSuit);
  if (suitCards.length === 0) return new Set(hand); // no suit to follow — ruff

  return new Set(suitCards);
}

/**
 * Returns true if a card belongs to a red suit (♥ or ♦).
 *
 * @param card - Card string.
 */
export function isRed(card: Card): boolean {
  const suit = getSuit(card);
  return suit === "♥" || suit === "♦";
}
