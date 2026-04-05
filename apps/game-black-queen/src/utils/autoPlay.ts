/**
 * Client-side auto-play card selection.
 *
 * Mirrors the server-side autoPlay.js logic so the client can pick a card
 * when the turn timer expires during the playing phase.
 *
 * Priority (strict):
 *  1. Follow suit  — highest card matching currentSuit.
 *  2. Strategic cut — if stack has points AND player has masterSuit cards,
 *     play the highest masterSuit card.
 *  3. Discard       — lowest card of the suit with fewest cards in hand.
 */

import type { Card, Suit } from "@/types";
import { getSuit, getValue } from "@/utils/cardUtils";

// ---------------------------------------------------------------------------
// Card ranking
// ---------------------------------------------------------------------------

const VALUE_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VALUE_RANK: Record<string, number> = Object.fromEntries(
  VALUE_ORDER.map((v, i) => [v, i])
);

function getCardRank(card: Card): number {
  return VALUE_RANK[getValue(card)] ?? -1;
}

const POINT_VALUES = new Set(['5', '10', 'A']);

function isPointCard(card: Card): boolean {
  if (card === 'Q♠') return true;
  return POINT_VALUES.has(getValue(card));
}

function highestCard(cards: Card[]): Card {
  return cards.reduce((best, c) => (getCardRank(c) > getCardRank(best) ? c : best));
}

function lowestCard(cards: Card[]): Card {
  return cards.reduce((best, c) => (getCardRank(c) < getCardRank(best) ? c : best));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StackEntry { card: Card }

/**
 * Selects a card for automatic play.
 *
 * @param hand         - The player's current hand.
 * @param currentSuit  - Suit of the first card played this round, or null.
 * @param masterSuit   - Trump suit chosen by the highest bidder, or null.
 * @param currentStack - Cards already played this round.
 * @returns The selected card string.
 */
export function getAutoPlayCard(
  hand: Card[],
  currentSuit: Suit | null,
  masterSuit: Suit | null,
  currentStack: StackEntry[],
): Card {
  if (!hand.length) throw new Error('autoPlay: hand is empty');

  // 1. Lead — no suit set yet, this player is starting the round
  if (!currentSuit) {
    return highestCard(hand);
  }

  // 2. Follow suit — currentSuit is non-null from here
  const suitCards = hand.filter((c) => getSuit(c) === currentSuit);
  if (suitCards.length > 0) return highestCard(suitCards);

  // 3. Strategic cut
  const stackHasPoints = currentStack.some((e) => isPointCard(e.card));
  if (stackHasPoints && masterSuit) {
    const masterCards = hand.filter((c) => getSuit(c) === masterSuit);
    if (masterCards.length > 0) return highestCard(masterCards);
  }

  // 4. Discard — suit with fewest cards, lowest card of that suit
  const bySuit = new Map<string, Card[]>();
  for (const card of hand) {
    const suit = getSuit(card) ?? '?';
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit)!.push(card);
  }

  let chosenSuit = bySuit.keys().next().value as string;
  let minCount = Infinity;
  for (const [suit, cards] of bySuit) {
    if (cards.length < minCount) {
      minCount = cards.length;
      chosenSuit = suit;
    }
  }

  return lowestCard(bySuit.get(chosenSuit)!);
}
