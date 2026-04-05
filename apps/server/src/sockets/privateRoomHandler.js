'use strict';

const { createRoom, joinRoom, getRoom, getAllRooms } = require('../db/roomStore');
const { generatePasskey } = require('../utils/generatePasskey');
const { EVENTS } = require('../config/constants');

/**
 * Registers private room socket event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
function registerPrivateRoomHandlers(socket, io) {
  socket.on(EVENTS.CREATE_PRIVATE_ROOM, (payload) => handleCreatePrivateRoom(socket, payload).catch((err) => { console.error('CREATE_PRIVATE_ROOM error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
  socket.on(EVENTS.JOIN_PRIVATE_ROOM,   (payload) => handleJoinPrivateRoom(socket, io, payload).catch((err) => { console.error('JOIN_PRIVATE_ROOM error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCreatePrivateRoom(socket, payload) {
  const alreadyIn = getAllRooms().find((r) => r.players.some((p) => p.id === socket.authUser.id));
  if (alreadyIn) {
    socket.emit(EVENTS.ROOM_JOINED, { room: alreadyIn });
    return;
  }

  const maxPlayers = (payload && Number.isInteger(payload.maxPlayers) && payload.maxPlayers >= 5 && payload.maxPlayers <= 10)
    ? payload.maxPlayers
    : 5;

  const passkey = generatePasskey();
  const player = buildPlayer(socket);
  const room = await createRoom({ isPrivate: true, passkey, maxPlayers, creatorName: player.username });
  await joinRoom(room.roomId, player);

  socket.join(room.roomId);

  socket.emit(EVENTS.PRIVATE_ROOM_CREATED, { roomId: room.roomId, passkey });
  socket.emit(EVENTS.ROOM_JOINED, { room });

  console.log(`Private room created: ${room.roomId} by ${socket.authUser.id}`);
}

async function handleJoinPrivateRoom(socket, io, payload) {
  if (!payload || typeof payload !== 'object') {
    socket.emit(EVENTS.ERROR, { message: 'Invalid payload' });
    return;
  }

  const { passkey } = payload;

  if (!passkey || typeof passkey !== 'string') {
    socket.emit(EVENTS.ERROR, { message: 'passkey is required' });
    return;
  }

  const alreadyIn = getAllRooms().find((r) => r.players.some((p) => p.id === socket.authUser.id));
  if (alreadyIn) {
    socket.emit(EVENTS.ROOM_JOINED, { room: alreadyIn });
    return;
  }

  const room = getAllRooms().find(
    (r) => r.isPrivate && r.status === 'waiting' && isPasskeyValid(r.passkey, passkey),
  );

  if (!room) {
    socket.emit(EVENTS.ERROR, { message: 'Invalid code or room no longer available' });
    return;
  }

  const player = buildPlayer(socket);
  const result = await joinRoom(room.roomId, player);

  if (!result.success) {
    socket.emit(EVENTS.ERROR, { message: result.error });
    return;
  }

  socket.join(room.roomId);
  socket.emit(EVENTS.ROOM_JOINED, { room: result.room });
  io.to(room.roomId).emit(EVENTS.ROOM_UPDATE, { players: result.room.players });

  console.log(`Player ${socket.authUser.id} joined private room ${room.roomId} (${result.room.players.length}/${result.room.maxPlayers})`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPlayer(socket) {
  return {
    id: socket.authUser.id,
    socketId: socket.id,
    username: socket.authUser.username,
    coins: socket.authUser.coins,
    hand: [],
    isConnected: true,
    hasPassed: false,
    bid: null,
    team: null,
  };
}

function isPasskeyValid(stored, supplied) {
  return stored.toUpperCase() === supplied.trim().toUpperCase();
}

module.exports = { registerPrivateRoomHandlers };
