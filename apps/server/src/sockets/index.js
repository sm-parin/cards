'use strict';

const { registerRoomHandlers } = require('./roomHandler');
const { registerPrivateRoomHandlers } = require('./privateRoomHandler');
const { registerGameHandlers } = require('./gameHandler');
const { registerBiddingHandlers } = require('./biddingHandler');
const { registerPartnerHandlers } = require('./partnerHandler');
const { registerGameplayHandlers } = require('./gameplayHandler');
const { getAllRooms, deleteRoom, findRoomByUserId, updatePlayerId } = require('../db/roomStore');
const { verifyToken } = require('../utils/jwt');
const { getUserById } = require('../store/userStore');
const { EVENTS } = require('../config/constants');

/** Grace period (ms) before an all-disconnected room is deleted. */
const ROOM_CLEANUP_DELAY_MS = 30_000;

/**
 * Initialises all Socket.IO event listeners on the given server instance.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @returns {void}
 */
function initSockets(io) {
  io.on('connection', (socket) =>
    onConnection(socket, io).catch((err) => {
      console.error('Socket connection error:', err);
      socket.disconnect(true);
    }),
  );
}

/**
 * Handles a new Socket.IO client connection.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {Promise<void>}
 */
async function onConnection(socket, io) {
  // ── JWT verification ─────────────────────────────────────────────────────
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.emit('ERROR', { message: 'Authentication required' });
    socket.disconnect(true);
    return;
  }

  let authUser;
  try {
    const payload = verifyToken(token);
    authUser = await getUserById(payload.userId);
  } catch (e) {
    socket.emit('ERROR', { message: 'Invalid or expired token' });
    socket.disconnect(true);
    return;
  }

  if (!authUser) {
    socket.emit('ERROR', { message: 'User not found' });
    socket.disconnect(true);
    return;
  }

  // Attach to socket for use in all handlers
  socket.authUser = authUser; // { id, username, coins }

  console.log(`User connected: ${socket.id} (userId: ${authUser.id})`);

  registerRoomHandlers(socket, io);
  registerPrivateRoomHandlers(socket, io);
  registerGameHandlers(socket, io);
  registerBiddingHandlers(socket, io);
  registerPartnerHandlers(socket, io);
  registerGameplayHandlers(socket, io);

  // ── INIT_PLAYER ────────────────────────────────────────────────────────────
  socket.on(EVENTS.INIT_PLAYER, () => handleInitPlayer(socket, io));

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    for (const room of getAllRooms()) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) continue;

      player.isConnected = false;

      io.to(room.roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });

      const allGone = room.players.every((p) => !p.isConnected);
      if (allGone && !room._cleanupTimer) {
        console.log(`All players left room ${room.roomId}. Scheduling cleanup in ${ROOM_CLEANUP_DELAY_MS / 1000}s.`);
        room._cleanupTimer = setTimeout(() => {
          deleteRoom(room.roomId).catch((err) => console.error('deleteRoom error:', err));
        }, ROOM_CLEANUP_DELAY_MS);
      }

      break;
    }
  });
}

// ---------------------------------------------------------------------------
// INIT_PLAYER handler
// ---------------------------------------------------------------------------

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
function handleInitPlayer(socket, io) {
  const userId = socket.authUser.id;

  const found = findRoomByUserId(userId);
  if (!found) return;

  const { room, player } = found;

  if (room._cleanupTimer) {
    clearTimeout(room._cleanupTimer);
    room._cleanupTimer = null;
  }

  updatePlayerId(room, player.socketId, socket.id);
  player.isConnected = true;

  socket.join(room.roomId);

  socket.emit(EVENTS.REJOIN_SUCCESS, { room });

  if (room.game && player.hand && player.hand.length > 0) {
    socket.emit(EVENTS.PLAYER_HAND, { cards: player.hand });
  }

  if (room.game) {
    let currentPlayerId = null;

    if (room.game.phase === 'bidding') {
      const { getCurrentBidder } = require('../services/biddingService');
      currentPlayerId = getCurrentBidder(room);
    } else if (room.game.phase === 'playing') {
      const { getCurrentPlayer } = require('../utils/turnUtils');
      const cp = getCurrentPlayer(room);
      currentPlayerId = cp ? cp.id : null;
    }

    if (currentPlayerId) {
      socket.emit(EVENTS.TURN_UPDATE, { currentPlayerId });
    }
  }

  io.to(room.roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });

  console.log(`Player ${userId} rejoined room ${room.roomId} via INIT_PLAYER (socket: ${socket.id})`);
}

module.exports = { initSockets };
