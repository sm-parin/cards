'use strict';

// ---------------------------------------------------------------------------
// Shuffle
// ---------------------------------------------------------------------------

/**
 * Returns a new array with elements in a randomly shuffled order.
 *
 * Uses the Fisher-Yates algorithm for an unbiased shuffle.
 * The original array is never mutated.
 *
 * @template T
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} A new array with the same elements in random order.
 */
function shufflePlayers(array) {
  const shuffled = array.slice();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// ---------------------------------------------------------------------------
// Turn queries
// ---------------------------------------------------------------------------

/**
 * Returns the player whose turn it currently is.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {import('../rooms/roomStore').Player|null}
 *   The current player object, or null if turn state is missing.
 */
function getCurrentPlayer(room) {
  if (!room.game || !room.game.turnOrder || room.game.turnOrder.length === 0) {
    return null;
  }

  const currentId = room.game.turnOrder[room.game.currentTurnIndex];

  return room.players.find((player) => player.id === currentId) ?? null;
}

/**
 * Advances the turn index to the next player, cycling back to the start.
 *
 * Mutates `room.game.currentTurnIndex` directly so the room store
 * remains the single source of truth.
 *
 * @param {import('../rooms/roomStore').Room} room - The active game room.
 * @returns {import('../rooms/roomStore').Player|null}
 *   The player whose turn it is after advancing, or null on error.
 */
function getNextTurn(room) {
  if (!room.game || !room.game.turnOrder || room.game.turnOrder.length === 0) {
    return null;
  }

  room.game.currentTurnIndex =
    (room.game.currentTurnIndex + 1) % room.game.turnOrder.length;

  return getCurrentPlayer(room);
}

module.exports = { shufflePlayers, getCurrentPlayer, getNextTurn };
