'use strict';

const { startGame, getRoom } = require('../db/roomStore');
const { getCurrentPlayer } = require('../utils/turnUtils');
const { EVENTS } = require('../config/constants');

/**
 * Registers game-lifecycle socket event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
function registerGameHandlers(socket, io) {
  socket.on(EVENTS.START_GAME, (payload) =>
    handleStartGame(socket, io, payload).catch((err) => {
      console.error('START_GAME error:', err);
      socket.emit(EVENTS.ERROR, { message: 'Internal server error' });
    }),
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleStartGame(socket, io, payload) {
  const validationError = validateStartPayload(payload);
  if (validationError) {
    socket.emit(EVENTS.ERROR, { message: validationError });
    return;
  }

  const { roomId } = payload;

  const readinessError = checkRoomReadiness(roomId);
  if (readinessError) {
    socket.emit(EVENTS.ERROR, { message: readinessError });
    return;
  }

  const result = await startGame(roomId);

  if (!result.success) {
    socket.emit(EVENTS.ERROR, { message: result.error });
    return;
  }

  io.to(roomId).emit(EVENTS.GAME_STARTED, { room: result.room });

  const currentPlayer = getCurrentPlayer(result.room);
  io.to(roomId).emit(EVENTS.TURN_UPDATE, { currentPlayerId: currentPlayer ? currentPlayer.id : null });

  emitPlayerHands(io, result.room);

  console.log(`Game started in room ${roomId} with ${result.room.players.length} players`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateStartPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';
  if (!payload.roomId || typeof payload.roomId !== 'string') return 'roomId is required';
  return null;
}

function checkRoomReadiness(roomId) {
  const room = getRoom(roomId);
  if (!room) return 'Room not found';
  if (room.status === 'playing') return 'Game already started';
  if (room.players.length < room.maxPlayers) return `Not enough players. Need at least ${room.maxPlayers}`;
  return null;
}

function emitPlayerHands(io, room) {
  room.players.forEach((player) => {
    io.to(player.socketId).emit(EVENTS.PLAYER_HAND, { cards: player.hand });
  });
}

module.exports = { registerGameHandlers };
