'use strict';

/**
 * Pure game-logic functions for the Jack-Thief game.
 *
 * No side-effects, no socket.io, no database calls.
 * All state mutations are explicit (passed in, returned, or mutated in-place as documented).
 *
 * @module services/jackThiefService
 */

const { createDeck: createBaseDeck, shuffleDeck } = require('../utils/cards');
const { JT_RULES } = require('../config/constants');

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of decks required for the given player count.
 * 2–5 players → 1 deck; 6–13 players → 2 decks.
 *
 * @param {number} playerCount
 * @returns {1|2}
 */
function getDeckCount(playerCount) {
  return playerCount <= JT_RULES.MAX_PLAYERS_ONE_DECK ? 1 : 2;
}

/**
 * Builds a shuffled deck with exactly one Jack of Hearts removed.
 *
 * @param {1|2} deckCount
 * @returns {string[]} Shuffled deck without one J♥
 */
function createDeck(deckCount) {
  const deck = shuffleDeck(createBaseDeck(deckCount));
  const idx = deck.indexOf('J♥');
  if (idx !== -1) deck.splice(idx, 1);
  return deck;
}

// ---------------------------------------------------------------------------
// Card value helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the rank from a card string (everything except the last character).
 * e.g. "Q♠" → "Q", "10♥" → "10", "J♣" → "J"
 *
 * @param {string} card
 * @returns {string}
 */
function getRank(card) {
  return card.slice(0, -1);
}

// ---------------------------------------------------------------------------
// Dealing
// ---------------------------------------------------------------------------

/**
 * Deals the deck as evenly as possible among players.
 * Any remainder cards are discarded (not dealt).
 *
 * @param {string[]} playerIds  - Ordered array of player IDs
 * @param {string[]} deck       - Pre-shuffled deck
 * @returns {{ [playerId: string]: string[] }}
 */
function dealCards(playerIds, deck) {
  const cardsPerPlayer = Math.floor(deck.length / playerIds.length);
  const hands = {};
  playerIds.forEach((id, i) => {
    hands[id] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  });
  return hands;
}

// ---------------------------------------------------------------------------
// Pair detection
// ---------------------------------------------------------------------------

/**
 * Finds all pairs in a hand.
 * Cards of the same rank form pairs; with 4 cards of the same rank, two pairs form.
 *
 * @param {string[]} hand
 * @returns {[string, string][]} Array of [card1, card2] pairs
 */
function findPairs(hand) {
  const byRank = {};
  for (const card of hand) {
    const rank = getRank(card);
    if (!byRank[rank]) byRank[rank] = [];
    byRank[rank].push(card);
  }
  const pairs = [];
  for (const cards of Object.values(byRank)) {
    for (let i = 0; i + 1 < cards.length; i += 2) {
      pairs.push([cards[i], cards[i + 1]]);
    }
  }
  return pairs;
}

/**
 * Removes all pairs from a hand.
 *
 * @param {string[]} hand
 * @returns {{ newHand: string[], discarded: [string, string][] }}
 */
function discardAllPairs(hand) {
  const pairs = findPairs(hand);
  if (pairs.length === 0) return { newHand: [...hand], discarded: [] };

  const indexesToRemove = new Set();
  for (const [c1, c2] of pairs) {
    // Find distinct indices for c1 and c2 (handles case where c1 === c2 string)
    let idx1 = -1;
    let idx2 = -1;
    for (let i = 0; i < hand.length; i++) {
      if (!indexesToRemove.has(i) && hand[i] === c1 && idx1 === -1) { idx1 = i; continue; }
      if (!indexesToRemove.has(i) && hand[i] === c2 && idx2 === -1) { idx2 = i; }
    }
    if (idx1 !== -1 && idx2 !== -1) {
      indexesToRemove.add(idx1);
      indexesToRemove.add(idx2);
    }
  }
  return {
    newHand: hand.filter((_, i) => !indexesToRemove.has(i)),
    discarded: pairs,
  };
}

/**
 * Validates a target selection request. Returns an error string or null if valid.
 * Called from JT_SELECT_TARGET, before the pick window opens.
 *
 * @param {object} state
 * @param {string} pickerId
 * @param {string} targetPlayerId
 * @returns {string|null}
 */
function validatePickTarget(state, pickerId, targetPlayerId) {
  if (!state.activePlayers.includes(targetPlayerId)) return 'That player is not active';
  if (targetPlayerId === pickerId) return 'Cannot pick from yourself';
  if (!state.hands[targetPlayerId] || state.hands[targetPlayerId].length === 0) {
    return 'That player has no cards';
  }
  // Pick-count constraint
  if (state.activePlayers.length > JT_RULES.MAX_PICKS_FROM_SAME) {
    const count = (state.pickCounts[pickerId] || {})[targetPlayerId] || 0;
    if (count >= JT_RULES.MAX_PICKS_FROM_SAME) {
      return `You have already picked from this player ${JT_RULES.MAX_PICKS_FROM_SAME} times`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pick validation
// ---------------------------------------------------------------------------

/**
 * Validates a pick request. Returns an error string or null if valid.
 *
 * @param {object} state   - Jack-Thief game state
 * @param {string} pickerId
 * @param {string} fromPlayerId
 * @returns {string|null}
 */
function validatePick(state, pickerId, fromPlayerId) {
  if (state.phase !== 'playing') return 'Game is not in playing phase';
  if (!state.activePlayers.includes(pickerId)) return 'You are not an active player';
  if (!state.activePlayers.includes(fromPlayerId)) return 'That player is not active';
  if (pickerId === fromPlayerId) return 'Cannot pick from yourself';
  if (!state.hands[fromPlayerId] || state.hands[fromPlayerId].length === 0) {
    return 'That player has no cards';
  }

  // Constraint: if >3 active players, a picker can pick from the same player at most 3 times
  if (state.activePlayers.length > JT_RULES.MAX_PICKS_FROM_SAME) {
    const pickerCounts = state.pickCounts[pickerId] || {};
    const count = pickerCounts[fromPlayerId] || 0;
    if (count >= JT_RULES.MAX_PICKS_FROM_SAME) {
      return `You have already picked from this player ${JT_RULES.MAX_PICKS_FROM_SAME} times`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pick resolution
// ---------------------------------------------------------------------------

/**
 * Executes a pick. Mutates `state.hands`, `state.handSizes`, and `state.pickCounts` in-place.
 *
 * @param {object} state            - Jack-Thief game state (mutated)
 * @param {string} pickerId
 * @param {string} fromPlayerId
 * @param {number} cardIndex        - Index of card in fromPlayer's hand (clamped to valid range)
 * @returns {{ card: string, paired: boolean, discardedPair: [string,string]|null }}
 */
function resolvePick(state, pickerId, fromPlayerId, cardIndex) {
  const fromHand = state.hands[fromPlayerId];
  const idx = Math.max(0, Math.min(cardIndex, fromHand.length - 1));
  const card = fromHand.splice(idx, 1)[0];
  const cardRank = getRank(card);

  // Always add picked card to picker's hand — no auto-discard
  // Players must manually tap two same-rank cards to discard a pair
  const pickerHand = state.hands[pickerId];
  pickerHand.push(card);

  const paired = false;
  const discardedPair = null;

  // Update pick-count tracking
  if (!state.pickCounts[pickerId]) state.pickCounts[pickerId] = {};
  state.pickCounts[pickerId][fromPlayerId] =
    (state.pickCounts[pickerId][fromPlayerId] || 0) + 1;

  // Sync public hand sizes
  state.handSizes[fromPlayerId] = state.hands[fromPlayerId].length;
  state.handSizes[pickerId] = state.hands[pickerId].length;

  return { card, paired, discardedPair };
}

// ---------------------------------------------------------------------------
// Win condition checks
// ---------------------------------------------------------------------------

/**
 * Returns player IDs of active players whose hands are now empty.
 *
 * @param {object} state
 * @returns {string[]}
 */
function checkNewWinners(state) {
  return state.activePlayers.filter((id) => state.hands[id] && state.hands[id].length === 0);
}

/**
 * Returns whether the game is over and who the loser is.
 *
 * @param {object} state
 * @returns {{ gameOver: boolean, loser: string|null }}
 */
function checkGameOver(state) {
  if (state.activePlayers.length === 1) {
    return { gameOver: true, loser: state.activePlayers[0] };
  }
  return { gameOver: false, loser: null };
}

module.exports = {
  getDeckCount,
  createDeck,
  getRank,
  dealCards,
  findPairs,
  discardAllPairs,
  validatePickTarget,
  validatePick,
  resolvePick,
  checkNewWinners,
  checkGameOver,
};
