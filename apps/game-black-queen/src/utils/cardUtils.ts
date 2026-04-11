/**
 * Card utility functions for Black Queen.
 * Shared primitives are re-exported from @cards/ui.
 * getValidCards is BQ-specific (suit-follow rule).
 */

export { getSuit, getValue, getRank, isRed } from "@cards/ui";

import type { Suit, Card } from "@/types";
import { getSuit } from "@cards/ui";

/**
 * Returns the set of cards the player is allowed to play.
 * - No suit led yet → any card valid.
 * - Suit led + player has matching cards → must follow suit.
 * - No matching cards → any card valid (ruff).
 */
export function getValidCards(hand: Card[], currentSuit: Suit | null): Set<Card> {
  if (currentSuit === null) return new Set(hand);
  const suitCards = hand.filter((c) => getSuit(c) === currentSuit);
  if (suitCards.length === 0) return new Set(hand);
  return new Set(suitCards);
}
