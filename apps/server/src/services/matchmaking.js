'use strict';

const { createRoom, joinRoom, getJoinableRooms } = require('../db/roomStore');

/**
 * Finds the most-filled joinable room, or creates a new one if none exist.
 *
 * @param {string[]} [excludeRoomIds]
 * @returns {Promise<import('../db/roomStore').Room>}
 */
async function findOrCreateRoom(excludeRoomIds) {
  const excluded = new Set(excludeRoomIds || []);
  const joinable = getJoinableRooms().filter((r) => !excluded.has(r.roomId));

  if (joinable.length > 0) {
    return getMostFilledRoom(joinable);
  }

  return createRoom();
}

/**
 * @param {import('../db/roomStore').Room[]} rooms
 * @returns {import('../db/roomStore').Room}
 */
function getMostFilledRoom(rooms) {
  return rooms.reduce((best, current) =>
    current.players.length > best.players.length ? current : best,
  );
}

/**
 * @param {import('../db/roomStore').Player} player
 * @param {string[]} [excludeRoomIds]
 * @returns {Promise<{ success: boolean, room: import('../db/roomStore').Room|null, error: string|null }>}
 */
async function assignPlayerToRoom(player, excludeRoomIds) {
  const room = await findOrCreateRoom(excludeRoomIds);
  return joinRoom(room.roomId, player);
}

module.exports = { assignPlayerToRoom };
