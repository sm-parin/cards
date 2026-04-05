'use strict';

const { BID_RULES } = require('../config/constants');

// ---------------------------------------------------------------------------
// Bid validation
// ---------------------------------------------------------------------------

/**
 * Returns bid rules (minBid, maxBid, increment) for the given deck count.
 *
 * @param {1|2} deckCount - Number of decks in use.
 * @returns {{ minBid: number, maxBid: number, increment: number }}
 */
function getRulesForDeck(deckCount) {
  return BID_RULES[deckCount] ?? BID_RULES[1];
}

/**
 * Validates a bid amount against the current game state.
 *
 * Rules checked:
 *  - Amount must be a positive integer.
 *  - Must be a multiple of the increment (5).
 *  - Must be ≥ minBid if no bid has been placed yet.
 *  - Must be > currentBid if a bid already exists.
 *  - Must not exceed maxBid.
 *
 * @param {number} amount          - The bid amount the player wants to place.
 * @param {number} currentBid      - The current highest bid in the room.
 * @param {1|2}    deckCount       - Number of decks in use.
 * @returns {string|null} Error message if invalid, or null if valid.
 */
function validateBid(amount, currentBid, deckCount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return 'Bid amount must be a positive integer';
  }

  const { minBid, maxBid, increment } = getRulesForDeck(deckCount);

  if (amount % increment !== 0) {
    return `Bid must be a multiple of ${increment}`;
  }

  if (currentBid === 0 && amount < minBid) {
    return `Opening bid must be at least ${minBid}`;
  }

  if (currentBid > 0 && amount <= currentBid) {
    return `Bid must be greater than the current bid of ${currentBid}`;
  }

  if (amount > maxBid) {
    return `Bid cannot exceed the maximum of ${maxBid}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Bid actions
// ---------------------------------------------------------------------------

/**
 * Records a player's bid in the game state.
 *
 * Mutates the bidding sub-object on room.game directly.
 * Callers must emit events and handle turn advancement.
 *
 * @param {import('../rooms/roomStore').Room}   room     - The active game room.
 * @param {import('../rooms/roomStore').Player} player   - The player placing the bid.
 * @param {number}                             amount   - Validated bid amount.
 * @returns {void}
 */
function recordBid(room, player, amount) {
  const { bidding } = room.game;

  bidding.currentBid = amount;
  bidding.highestBidder = player.id;
  bidding.bids.push({ playerId: player.id, amount });

  player.bid = amount;
}

/**
 * Marks a player as having passed their bid for this round.
 *
 * The pass is temporary — the player is not removed from turnOrder
 * so they may bid again in future rounds if game rules allow.
 *
 * @param {import('../rooms/roomStore').Player} player - The player who is passing.
 * @returns {void}
 */
function recordPass(player) {
  player.hasPassed = true;
}

// ---------------------------------------------------------------------------
// Turn advancement
// ---------------------------------------------------------------------------

/**
 * Advances the bidding turn to the next player in turnOrder.
 *
 * Uses the bidding sub-object's own currentTurnIndex so bidding turn tracking
 * is independent from general game turn tracking.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {string} The player ID whose turn it is after advancing.
 */
function advanceBiddingTurn(room) {
  const { bidding, turnOrder } = room.game;

  bidding.currentTurnIndex = (bidding.currentTurnIndex + 1) % turnOrder.length;

  return turnOrder[bidding.currentTurnIndex];
}

/**
 * Returns the player ID whose turn it currently is in the bidding phase.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {string|null} Current bidder's player ID, or null if state is invalid.
 */
function getCurrentBidder(room) {
  if (!room.game || !room.game.bidding) return null;

  const { bidding, turnOrder } = room.game;

  return turnOrder[bidding.currentTurnIndex] ?? null;
}

// ---------------------------------------------------------------------------
// End-of-bidding
// ---------------------------------------------------------------------------

/**
 * Checks whether bidding should end given the current bid amount.
 *
 * Bidding ends immediately when the maximum possible bid is reached.
 *
 * @param {number} amount    - The bid amount just placed.
 * @param {1|2}    deckCount - Number of decks in use.
 * @returns {boolean} True if bidding should end.
 */
function isMaxBidReached(amount, deckCount) {
  const { maxBid } = getRulesForDeck(deckCount);
  return amount >= maxBid;
}

/**
 * Transitions the game phase from "bidding" to "partner-selection".
 *
 * Mutates room.game.phase directly.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {void}
 */
function endBidding(room) {
  room.game.phase = 'partner-selection';
}

/**
 * Checks whether all players except the current highest bidder have passed.
 *
 * When true, bidding should end immediately — no need to wait for the max bid.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {boolean} True if all non-bidder players have passed.
 */
function haveAllOthersPassed(room) {
  const { highestBidder } = room.game.bidding;
  if (!highestBidder) return false; // no bid placed yet — can't end bidding

  return room.players
    .filter((p) => p.id !== highestBidder)
    .every((p) => p.hasPassed);
}

/**
 * Checks whether all players have passed without anyone placing a bid.
 *
 * When true, the round should end immediately with no winner.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {boolean} True if every player has passed and no bid was placed.
 */
function haveAllPassed(room) {
  if (room.game.bidding.highestBidder !== null) return false; // someone bid
  return room.players.every((p) => p.hasPassed);
}

module.exports = {
  getRulesForDeck,
  validateBid,
  recordBid,
  recordPass,
  advanceBiddingTurn,
  getCurrentBidder,
  isMaxBidReached,
  haveAllOthersPassed,
  haveAllPassed,
  endBidding,
};
