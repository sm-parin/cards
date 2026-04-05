/**
 * Card utility functions for Jack Thief.
 */

import type { Card, Suit } from "@/types";

/**
 * Extracts the suit from a card string (last character).
 * e.g. "Q♠" → "♠", "10♥" → "♥"
 */
export function getSuit(card: Card): Suit | null {
  const s = card.slice(-1);
  if (s === "♥" || s === "♣" || s === "♦" || s === "♠") return s as Suit;
  return null;
}

/**
 * Extracts the rank (value) from a card string (everything except the last character).
 * e.g. "Q♠" → "Q", "10♥" → "10", "J♣" → "J"
 */
export function getRank(card: Card): string {
  return card.slice(0, -1);
}

/**
 * Returns true if the card suit is red (♥ or ♦).
 */
export function isRed(card: Card): boolean {
  const s = getSuit(card);
  return s === "♥" || s === "♦";
}

/**
 * Finds all pairs in a hand (same rank).
 * With 4 cards of the same rank (2-deck game), returns two pairs.
 *
 * @returns Array of [card1, card2] index pairs
 */
export function findPairsInHand(hand: Card[]): [Card, Card][] {
  const byRank: Record<string, Card[]> = {};
  for (const card of hand) {
    const rank = getRank(card);
    if (!byRank[rank]) byRank[rank] = [];
    byRank[rank].push(card);
  }
  const pairs: [Card, Card][] = [];
  for (const cards of Object.values(byRank)) {
    for (let i = 0; i + 1 < cards.length; i += 2) {
      pairs.push([cards[i], cards[i + 1]]);
    }
  }
  return pairs;
}
