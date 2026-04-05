/**
 * Bid calculation utilities.
 *
 * Pure functions — no side effects, no store access.
 * Mirror the bid rules defined in `blackqueen-backend/src/config/constants.js`.
 *
 * @module utils/bidUtils
 */

import { BID_RULES } from "@/config/gameRules";

/**
 * Returns the minimum valid next bid.
 *
 * - If no bids have been placed (currentBid === 0) → use the deck's minBid.
 * - Otherwise → currentBid + increment (5).
 *
 * @param currentBid  - The current highest bid; 0 if no bids placed yet.
 * @param deckCount   - 1 or 2 decks, determines rule set.
 */
export function getNextMinBid(currentBid: number, deckCount: 1 | 2): number {
  const rules = BID_RULES[deckCount];
  return currentBid === 0 ? rules.minBid : currentBid + rules.increment;
}

/**
 * Returns the maximum allowed bid for the given deck count.
 *
 * @param deckCount - 1 or 2 decks.
 */
export function getMaxBid(deckCount: 1 | 2): number {
  return BID_RULES[deckCount].maxBid;
}

/**
 * Returns the bid increment step (always 5).
 *
 * @param deckCount - 1 or 2 decks.
 */
export function getBidIncrement(deckCount: 1 | 2): number {
  return BID_RULES[deckCount].increment;
}

/**
 * Returns true if the given amount is a valid next bid.
 *
 * Mirrors server-side validation:
 * - Must be a multiple of the increment (5).
 * - Must be ≥ nextMinBid.
 * - Must be ≤ maxBid.
 *
 * @param amount      - The bid amount to validate.
 * @param currentBid  - The current highest bid.
 * @param deckCount   - 1 or 2 decks.
 */
export function isValidBid(
  amount: number,
  currentBid: number,
  deckCount: 1 | 2
): boolean {
  const { increment, maxBid } = BID_RULES[deckCount];
  const nextMin = getNextMinBid(currentBid, deckCount);
  return amount >= nextMin && amount <= maxBid && amount % increment === 0;
}

/**
 * Clamps and aligns a bid amount to the nearest valid value within bounds.
 *
 * Useful when the currentBid changes and a previously selected amount needs
 * to be adjusted upward to remain valid.
 *
 * @param amount      - The desired bid amount.
 * @param currentBid  - The current highest bid.
 * @param deckCount   - 1 or 2 decks.
 */
export function clampBid(
  amount: number,
  currentBid: number,
  deckCount: 1 | 2
): number {
  const nextMin = getNextMinBid(currentBid, deckCount);
  const maxBid = getMaxBid(deckCount);
  return Math.min(Math.max(amount, nextMin), maxBid);
}
