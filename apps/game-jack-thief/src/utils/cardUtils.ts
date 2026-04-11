/**
 * Card utility functions for Jack Thief.
 * Shared primitives are re-exported from @cards/ui.
 * findPairsInHand is JT-specific.
 */

export { getSuit, getRank, isRed } from "@cards/ui";

import type { Card } from "@/types";
import { getRank } from "@cards/ui";

/**
 * Finds all pairs in a hand (same rank).
 * With 4 cards of the same rank (2-deck game), returns two pairs.
 *
 * @returns Array of [card1, card2] pairs
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
