'use strict';

const { createDeck, shuffleDeck, sortCardsAscending } = require('../utils/cards');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Use 1 deck for up to this many players; 2 decks above. */
const SINGLE_DECK_MAX_PLAYERS = 7;

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Determines how many 52-card decks are needed for the given player count.
 *
 * Rule: 5–7 players → 1 deck; 8–10 players → 2 decks.
 *
 * @param {number} playerCount - Number of players in the game.
 * @returns {1|2} Number of decks to use.
 */
function getDeckCount(playerCount) {
  return playerCount <= SINGLE_DECK_MAX_PLAYERS ? 1 : 2;
}

/**
 * Deals cards equally among players and discards any remainder cards.
 *
 * Algorithm:
 *  1. Determine deck count from player count.
 *  2. Create and shuffle the combined deck.
 *  3. Calculate how many cards each player receives (floor division).
 *  4. Slice the deck into per-player hands.
 *  5. Sort remaining cards ascending and discard the lowest-value ones.
 *
 * The function is pure — it does not mutate the player objects. Callers are
 * responsible for assigning the returned hands back to their players.
 *
 * @param {import('../rooms/roomStore').Player[]} players - Players to deal to.
 * @returns {{
 *   hands: Object.<string, string[]>,
 *   deckCount: 1|2,
 *   discarded: string[]
 * }}
 *   - hands:     Map of playerId → array of card strings.
 *   - deckCount: Number of decks used.
 *   - discarded: Cards that were removed due to unequal distribution.
 */
function dealCards(players) {
  const playerCount = players.length;
  const deckCount = getDeckCount(playerCount);

  const deck = shuffleDeck(createDeck(deckCount));

  const cardsPerPlayer = Math.floor(deck.length / playerCount);
  const remainder = deck.length % playerCount;

  /** @type {Object.<string, string[]>} */
  const hands = {};

  players.forEach((player, index) => {
    const start = index * cardsPerPlayer;
    hands[player.id] = deck.slice(start, start + cardsPerPlayer);
  });

  const remainderCards = deck.slice(playerCount * cardsPerPlayer);
  const discarded = sortCardsAscending(remainderCards).slice(0, remainder);

  return { hands, deckCount, discarded };
}

module.exports = { dealCards, getDeckCount };
