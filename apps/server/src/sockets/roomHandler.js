'use strict';

const { assignPlayerToRoom } = require('../services/matchmaking');
const { getRoom, getAllRooms, createRoom, joinRoom, removePlayerFromRoom, deleteRoom, updatePlayerId } = require('../db/roomStore');
const { EVENTS } = require('../config/constants');

/**
 * Registers room-related socket event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket - The connected client socket.
 * @param {import('socket.io').Server} io     - The Socket.IO server instance.
 * @returns {void}
 */
function registerRoomHandlers(socket, io) {
  socket.visitedRooms = new Set();

  socket.on(EVENTS.PLAY_NOW,            (payload) => handlePlayNow(socket, io, payload).catch((err) => { console.error('PLAY_NOW error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
  socket.on(EVENTS.REJOIN_ROOM,         (payload) => handleRejoinRoom(socket, io, payload));
  socket.on(EVENTS.LEAVE_ROOM,          (payload) => handleLeaveRoom(socket, io, payload).catch((err) => { console.error('LEAVE_ROOM error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
  socket.on(EVENTS.UPDATE_MAX_PLAYERS,  (payload) => handleUpdateMaxPlayers(socket, io, payload));
  socket.on(EVENTS.GET_LOBBIES,         ()        => handleGetLobbies(socket));
  socket.on(EVENTS.CREATE_PUBLIC_LOBBY, (payload) => handleCreatePublicLobby(socket, io, payload).catch((err) => { console.error('CREATE_PUBLIC_LOBBY error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
  socket.on(EVENTS.JOIN_PUBLIC_LOBBY,   (payload) => handleJoinPublicLobby(socket, io, payload).catch((err) => { console.error('JOIN_PUBLIC_LOBBY error:', err); socket.emit(EVENTS.ERROR, { message: 'Internal server error' }); }));
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handlePlayNow(socket, io, payload) {
  const alreadyIn = getAllRooms().find((r) => r.players.some((p) => p.id === socket.authUser.id));
  if (alreadyIn) {
    socket.emit(EVENTS.ROOM_JOINED, { room: alreadyIn });
    return;
  }

  const player = buildPlayer(socket);
  const result = await assignPlayerToRoom(player, Array.from(socket.visitedRooms));

  if (!result.success) {
    socket.emit('ERROR', { message: result.error });
    return;
  }

  const { room } = result;

  socket.join(room.roomId);
  socket.emit(EVENTS.ROOM_JOINED, { room });
  io.to(room.roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });

  console.log(`Player ${socket.authUser.id} joined room ${room.roomId} (${room.players.length}/${room.maxPlayers})`);
}

function handleRejoinRoom(socket, io, payload) {
  if (!payload || typeof payload !== 'object') {
    socket.emit(EVENTS.ERROR, { message: 'Invalid payload' });
    return;
  }

  const { roomId } = payload;

  if (!roomId || typeof roomId !== 'string') {
    socket.emit(EVENTS.ERROR, { message: 'roomId is required' });
    return;
  }

  const room = getRoom(roomId);
  if (!room) {
    socket.emit(EVENTS.ERROR, { message: 'Room not found' });
    return;
  }

  const player = room.players.find((p) => p.id === socket.authUser.id);
  if (!player) {
    socket.emit(EVENTS.ERROR, { message: 'Player not found in room' });
    return;
  }

  if (room._cleanupTimer) {
    clearTimeout(room._cleanupTimer);
    room._cleanupTimer = null;
  }

  updatePlayerId(room, player.socketId, socket.id);
  player.isConnected = true;

  socket.join(roomId);
  socket.emit(EVENTS.ROOM_JOINED, { room });
  io.to(roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });

  if (room.game) {
    const { getCurrentBidder } = require('../services/biddingService');
    const { getCurrentPlayer } = require('../utils/turnUtils');

    let currentPlayerId = null;
    if (room.game.phase === 'bidding') {
      currentPlayerId = getCurrentBidder(room);
    } else if (room.game.phase === 'playing') {
      const cp = getCurrentPlayer(room);
      currentPlayerId = cp ? cp.id : null;
    }

    if (currentPlayerId) {
      socket.emit(EVENTS.TURN_UPDATE, { currentPlayerId });
    }
  }

  console.log(`Player ${socket.authUser.id} rejoined room ${roomId} (socket: ${socket.id})`);
}

async function handleLeaveRoom(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string') {
    socket.emit(EVENTS.ERROR, { message: 'roomId is required' });
    return;
  }

  const { roomId } = payload;
  const result = removePlayerFromRoom(roomId, socket.id);

  if (!result.success) {
    socket.emit(EVENTS.ERROR, { message: result.error });
    return;
  }

  socket.leave(roomId);
  socket.visitedRooms.add(roomId);

  const room = getRoom(roomId);

  if (room && room.players.length === 0) {
    await deleteRoom(roomId);
  } else if (room) {
    io.to(roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });
  }

  console.log(`Player ${socket.authUser.id} left room ${roomId}`);
}

function handleUpdateMaxPlayers(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || !Number.isInteger(payload.maxPlayers)) {
    socket.emit(EVENTS.ERROR, { message: 'roomId and maxPlayers are required' });
    return;
  }

  const { roomId, maxPlayers } = payload;
  const room = getRoom(roomId);

  if (!room) {
    socket.emit(EVENTS.ERROR, { message: 'Room not found' });
    return;
  }

  if (room.status !== 'waiting') {
    socket.emit(EVENTS.ERROR, { message: 'Cannot change players after game has started' });
    return;
  }

  if (!room.players.length || room.players[0].id !== socket.authUser.id) {
    socket.emit(EVENTS.ERROR, { message: 'Only the room creator can change the player limit' });
    return;
  }

  if (maxPlayers < room.players.length) {
    socket.emit(EVENTS.ERROR, { message: `Cannot set limit below current player count (${room.players.length})` });
    return;
  }

  if (maxPlayers < 2 || maxPlayers > 13) {
    socket.emit(EVENTS.ERROR, { message: 'Player limit must be between 2 and 13' });
    return;
  }

  room.maxPlayers = maxPlayers;

  io.to(roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players, maxPlayers: room.maxPlayers });

  console.log(`Room ${roomId} maxPlayers updated to ${maxPlayers} by ${socket.authUser.id}`);
}

function handleGetLobbies(socket) {
  const lobbies = getAllRooms()
    .filter((r) => !r.isPrivate && r.status === 'waiting' && r.players.length < r.maxPlayers)
    .map((r) => ({
      roomId: r.roomId,
      creatorName: r.creatorName,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
    }));

  socket.emit(EVENTS.LOBBIES_LIST, { lobbies });
}

async function handleCreatePublicLobby(socket, io, payload) {
  const alreadyIn = getAllRooms().find((r) => r.players.some((p) => p.id === socket.authUser.id));
  if (alreadyIn) {
    socket.emit(EVENTS.ROOM_JOINED, { room: alreadyIn });
    return;
  }

  const maxPlayers = (payload && Number.isInteger(payload.maxPlayers) && payload.maxPlayers >= 2 && payload.maxPlayers <= 13)
    ? payload.maxPlayers
    : 5;

  const player = buildPlayer(socket);
  const room = await createRoom({ isPrivate: false, maxPlayers, creatorName: player.username });
  await joinRoom(room.roomId, player);
  room.creatorName = player.username;

  socket.join(room.roomId);
  socket.emit(EVENTS.ROOM_JOINED, { room });
  io.to(room.roomId).emit(EVENTS.ROOM_UPDATE, { players: room.players });

  console.log(`Public lobby created: ${room.roomId} (max ${maxPlayers}) by ${socket.authUser.id}`);
}

async function handleJoinPublicLobby(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string') {
    socket.emit(EVENTS.ERROR, { message: 'roomId is required' });
    return;
  }

  const alreadyIn = getAllRooms().find((r) => r.players.some((p) => p.id === socket.authUser.id));
  if (alreadyIn) {
    socket.emit(EVENTS.ROOM_JOINED, { room: alreadyIn });
    return;
  }

  const { roomId } = payload;
  const player = buildPlayer(socket);
  const result = await joinRoom(roomId, player);

  if (!result.success) {
    socket.emit(EVENTS.ERROR, { message: result.error });
    return;
  }

  socket.join(roomId);
  socket.emit(EVENTS.ROOM_JOINED, { room: result.room });
  io.to(roomId).emit(EVENTS.ROOM_UPDATE, { players: result.room.players });

  console.log(`Player ${socket.authUser.id} joined public lobby ${roomId} (${result.room.players.length}/${result.room.maxPlayers})`);
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

module.exports = { registerRoomHandlers };
