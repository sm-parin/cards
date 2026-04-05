'use strict';

const { getCardValue, getSuitFromCard } = require('../utils/cards');
const { getCurrentPlayer, getNextTurn } = require('../utils/turnUtils');

// ---------------------------------------------------------------------------
// Card-play validation
// ---------------------------------------------------------------------------

/**
 * Validates that a player is allowed to play a given card.
 *
 * Rules:
 *  1. The card must be in the player's hand.
 *  2. If a suit has been led (currentSuit), the player MUST follow suit unless
 *     they have no cards of that suit.
 *
 * Throws a descriptive Error on violation.
 *
 * @param {import('../rooms/roomStore').Room}   room
 * @param {import('../rooms/roomStore').Player} player
 * @param {string} card
 */
function validateCardPlay(room, player, card) {
  if (!player.hand.includes(card)) {
    throw new Error('Card not in hand.');
  }

  const { currentSuit } = room.game;
  if (!currentSuit) return; // first card of stack — anything goes

  const cardSuit = getSuitFromCard(card);
  if (cardSuit === currentSuit) return; // following suit — OK

  // Player is not following suit; only allowed if they have no currentSuit card
  const hasCurrentSuit = player.hand.some(
    (c) => getSuitFromCard(c) === currentSuit,
  );
  if (hasCurrentSuit) {
    throw new Error(`You must follow suit (${currentSuit}).`);
  }
}

// ---------------------------------------------------------------------------
// Hand mutation
// ---------------------------------------------------------------------------

/**
 * Removes `card` from `player.hand` in place.
 *
 * @param {import('../rooms/roomStore').Player} player
 * @param {string} card
 */
function removeCardFromHand(player, card) {
  const idx = player.hand.indexOf(card);
  if (idx !== -1) player.hand.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Stack state mutation
// ---------------------------------------------------------------------------

/**
 * Appends a played card to the current stack and, if this is the first card,
 * sets the led suit.
 *
 * @param {import('../rooms/roomStore').Room} room
 * @param {string} playerId
 * @param {string} card
 */
function addToStack(room, playerId, card) {
  room.game.currentStack.push({ playerId, card });
  if (room.game.currentStack.length === 1) {
    room.game.currentSuit = getSuitFromCard(card);
  }
}

// ---------------------------------------------------------------------------
// Partner reveal check
// ---------------------------------------------------------------------------

/**
 * Checks whether the played card reveals a partner.
 * If the card is one of the pre-selected partner cards and the player is not
 * already in the partners list, they are added.
 *
 * @param {import('../rooms/roomStore').Room} room
 * @param {string} playerId
 * @param {string} card
 * @returns {boolean} `true` if a partner was revealed on this play.
 */
function checkPartnerReveal(room, playerId, card) {
  const { partner } = room.game;
  if (!partner.selectedCards.includes(card)) return false;
  if (partner.partners.includes(playerId)) return false;

  partner.partners.push(playerId);
  partner.revealed = true;
  return true;
}

// ---------------------------------------------------------------------------
// Stack winner resolution
// ---------------------------------------------------------------------------

/**
 * Determines the winner of a completed stack.
 *
 * Algorithm:
 *  - If any master-suit card was played, the highest master-suit card wins.
 *  - Otherwise, the highest led-suit card wins.
 *  - On a tie in value, the card played first (lower array index) wins.
 *
 * @param {Array<{playerId:string, card:string}>} stack - Played cards in order.
 * @param {string} masterSuit - The trump suit.
 * @param {string} currentSuit - The suit led this stack.
 * @returns {{ winner: string, cards: Array<{playerId:string, card:string}> }}
 */
function resolveStackWinner(stack, masterSuit, currentSuit) {
  const masterCards = stack.filter(
    (e) => getSuitFromCard(e.card) === masterSuit,
  );
  const candidates = masterCards.length > 0 ? masterCards : stack.filter(
    (e) => getSuitFromCard(e.card) === currentSuit,
  );

  // Highest value wins; on equal value the entry with the smaller index in
  // `stack` (played earlier) wins — achieved by iterating left-to-right and
  // keeping the *first* max seen.
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (getCardValue(candidates[i].card) > getCardValue(best.card)) {
      best = candidates[i];
    }
  }

  return { winner: best.playerId, cards: stack };
}

// ---------------------------------------------------------------------------
// Post-stack state transitions
// ---------------------------------------------------------------------------

/**
 * Sets `room.game.currentTurnIndex` so the stack winner plays first next round.
 *
 * @param {import('../rooms/roomStore').Room} room
 * @param {string} winnerId
 */
function setStackWinnerTurn(room, winnerId) {
  const idx = room.game.turnOrder.indexOf(winnerId);
  if (idx !== -1) room.game.currentTurnIndex = idx;
}

/**
 * Archives the completed stack in `history` and resets per-stack state.
 *
 * @param {import('../rooms/roomStore').Room} room
 * @param {{ winner: string, cards: Array }} result
 */
function finaliseStack(room, result) {
  room.game.history.push(result);
  room.game.currentStack = [];
  room.game.currentSuit = null;
}

module.exports = {
  validateCardPlay,
  removeCardFromHand,
  addToStack,
  checkPartnerReveal,
  resolveStackWinner,
  setStackWinnerTurn,
  finaliseStack,
};
