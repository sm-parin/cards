'use strict';

const { SUITS } = require('../config/constants');

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates a suit string against the list of known suit symbols.
 *
 * @param {unknown} suit - Value to validate.
 * @returns {string|null} Error message, or null if valid.
 */
function validateSuit(suit) {
  if (!suit || typeof suit !== 'string') {
    return 'suit is required and must be a string';
  }

  if (!SUITS.includes(suit)) {
    return `Invalid suit. Must be one of: ${SUITS.join(', ')}`;
  }

  return null;
}

/**
 * Validates an array of partner cards against the expected count for the deck.
 *
 * Rules:
 *  - Must be an array of strings.
 *  - Length must equal the required partner count (1 for 1 deck, 2 for 2 decks).
 *  - Each entry must be a non-empty string.
 *
 * @param {unknown} cards     - Value to validate.
 * @param {1|2}     deckCount - Number of decks used in this game.
 * @returns {string|null} Error message, or null if valid.
 */
function validatePartnerCards(cards, deckCount) {
  if (!Array.isArray(cards)) {
    return 'cards must be an array';
  }

  const required = getRequiredPartnerCount(deckCount);

  if (cards.length !== required) {
    return `Exactly ${required} partner card(s) must be selected for a ${deckCount}-deck game`;
  }

  const allStrings = cards.every((card) => typeof card === 'string' && card.length > 0);
  if (!allStrings) {
    return 'Each partner card must be a non-empty string';
  }

  return null;
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/**
 * Records the master suit selection on the game state.
 *
 * Mutates `room.game.masterSuit` directly.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @param {string}                           suit - The chosen suit symbol.
 * @returns {void}
 */
function recordMasterSuit(room, suit) {
  room.game.masterSuit = suit;
}

/**
 * Records partner card selection and transitions the game phase to "playing".
 *
 * Stores the selected cards in `room.game.partner.selectedCards`.
 * Partner identity is NOT resolved here — it remains hidden until the
 * partner card is played during the playing phase.
 *
 * Mutates `room.game.partner.selectedCards` and `room.game.phase`.
 *
 * @param {import('../rooms/roomStore').Room} room  - The active game room.
 * @param {string[]}                         cards - Validated partner card strings.
 * @returns {void}
 */
function recordPartnerSelection(room, cards) {
  room.game.partner.selectedCards = cards;
  room.game.phase = 'playing';
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of partner cards required based on deck count.
 *
 * @param {1|2} deckCount - Number of decks in use.
 * @returns {number} Required partner card count.
 */
function getRequiredPartnerCount(deckCount) {
  return deckCount === 2 ? 2 : 1;
}

/**
 * Guards that the acting socket is the highest bidder.
 *
 * @param {import('../rooms/roomStore').Room} room     - The active game room.
 * @param {string}                           socketId - Socket ID of the acting player.
 * @returns {string|null} Error message, or null if authorised.
 */
function assertHighestBidder(room, socketId) {
  if (!room.game || !room.game.bidding) return 'Game state is missing';

  if (room.game.bidding.highestBidder !== socketId) {
    return 'Only the highest bidder may perform this action';
  }

  return null;
}

/**
 * Guards that the game is in the expected phase.
 *
 * @param {import('../rooms/roomStore').Room} room          - The active game room.
 * @param {string}                           expectedPhase - The phase the game must be in.
 * @returns {string|null} Error message, or null if the phase matches.
 */
function assertPhase(room, expectedPhase) {
  if (!room) return 'Room not found';
  if (!room.game) return 'Game has not started';

  if (room.game.phase !== expectedPhase) {
    return `Expected game phase "${expectedPhase}" but current phase is "${room.game.phase}"`;
  }

  return null;
}

module.exports = {
  validateSuit,
  validatePartnerCards,
  recordMasterSuit,
  recordPartnerSelection,
  getRequiredPartnerCount,
  assertHighestBidder,
  assertPhase,
};
