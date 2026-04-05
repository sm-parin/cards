'use strict';

const { getCardValue, getSuitFromCard } = require('./cards');

// ---------------------------------------------------------------------------
// Point-card detection
// ---------------------------------------------------------------------------

/** Card values that carry points in the game. */
const POINT_VALUES = new Set(['5', '10', 'A']);

/**
 * Returns true if the given card is a point card (5, 10, A of any suit, or Q♠).
 *
 * @param {string} card - Card string (e.g. "Q♠", "10♥").
 * @returns {boolean}
 */
function isPointCard(card) {
  if (card === 'Q♠') return true;
  const value = card.slice(0, -1);
  return POINT_VALUES.has(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Selects a card for automatic play when a player fails to act in time.
 *
 * Priority order (strict):
 *  1. Follow suit  — if hand has cards matching `currentSuit`, return the
 *     HIGHEST-ranked card of that suit.
 *  2. Strategic cut — if the current stack contains at least one point card
 *     AND the hand has master-suit cards, return the HIGHEST master-suit card.
 *  3. Discard       — group remaining cards by suit; pick the suit with the
 *     FEWEST cards (ties broken by suit order in hand); return the LOWEST-
 *     ranked card of that suit.
 *
 * This function is deterministic and never mutates its inputs.
 *
 * @param {{ hand: string[] }}                          player    - Player object; only `hand` is used.
 * @param {{ currentSuit: string|null, masterSuit: string|null, currentStack: Array<{card: string}> }} gameState
 *   - `currentSuit`  — suit of the first card played in this stack, or null.
 *   - `masterSuit`   — trump suit chosen by the highest bidder, or null.
 *   - `currentStack` — cards already played this stack (array of { playerId, card }).
 * @returns {string} The selected card string.
 * @throws {Error} If the player's hand is empty.
 */
function getAutoPlayCard(player, gameState) {
  const hand = player.hand;

  if (!hand || hand.length === 0) {
    throw new Error('autoPlay: player hand is empty');
  }

  const { currentSuit, masterSuit, currentStack } = gameState;

  // ---- 1. Lead — no suit set, this player starts the round ---------------
  if (!currentSuit) {
    return highestCard(hand);
  }

  // ---- 2. Follow suit -----------------------------------------------------
  const suitCards = hand.filter((c) => getSuitFromCard(c) === currentSuit);
  if (suitCards.length > 0) {
    return highestCard(suitCards);
  }

  // ---- 2. Strategic cut ---------------------------------------------------
  const stackHasPoints = Array.isArray(currentStack) &&
    currentStack.some((entry) => isPointCard(entry.card));

  if (stackHasPoints && masterSuit) {
    const masterCards = hand.filter((c) => getSuitFromCard(c) === masterSuit);
    if (masterCards.length > 0) {
      return highestCard(masterCards);
    }
  }

  // ---- 3. Discard strategy ------------------------------------------------
  // Group all hand cards by suit.
  /** @type {Map<string, string[]>} */
  const bySuit = new Map();
  for (const card of hand) {
    const suit = getSuitFromCard(card);
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit).push(card);
  }

  // Pick the suit with the fewest cards (stable: Map preserves insertion order
  // so the first suit encountered wins ties, giving a consistent result).
  let chosenSuit = null;
  let minCount = Infinity;
  for (const [suit, cards] of bySuit) {
    if (cards.length < minCount) {
      minCount = cards.length;
      chosenSuit = suit;
    }
  }

  return lowestCard(bySuit.get(chosenSuit));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the card with the highest rank from a non-empty array.
 *
 * @param {string[]} cards
 * @returns {string}
 */
function highestCard(cards) {
  return cards.reduce((best, c) => (getCardValue(c) > getCardValue(best) ? c : best));
}

/**
 * Returns the card with the lowest rank from a non-empty array.
 *
 * @param {string[]} cards
 * @returns {string}
 */
function lowestCard(cards) {
  return cards.reduce((best, c) => (getCardValue(c) < getCardValue(best) ? c : best));
}

module.exports = { getAutoPlayCard };
