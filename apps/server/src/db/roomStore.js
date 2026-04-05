'use strict';

const { generateId } = require('../utils/generateId');
const { shufflePlayers } = require('../utils/turnUtils');
const { dealCards } = require('../services/dealCards');
const redis = require('./redis');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOBBY_TTL = 30 * 60;      // 30 minutes
const GAME_TTL  = 2 * 60 * 60;  // 2 hours

const lobbyKey = (id) => `room:${id}:lobby`;
const gameKey  = (id) => `game:${id}:state`;

const DEFAULT_MAX_PLAYERS = 5;
const STATUS_WAITING = 'waiting';
const STATUS_PLAYING = 'playing';

// ---------------------------------------------------------------------------
// In-memory live state
// ---------------------------------------------------------------------------

/**
 * Primary in-memory store. Game logic files safely mutate objects returned
 * by getRoom() because both sides share the same reference.
 *
 * Redis is updated as a write-through cache on key state transitions:
 * createRoom, joinRoom, startGame, deleteRoom.
 *
 * NOTE: Mid-turn mutations (bid updates, card plays, partner state) are NOT
 * synced to Redis — they live only in memory. This is an acceptable trade-off
 * given the requirement to preserve direct-mutation semantics without
 * refactoring all game-logic files.
 *
 * @type {Object.<string, Room>}
 */
const rooms = {};

// ---------------------------------------------------------------------------
// Redis helper
// ---------------------------------------------------------------------------

/**
 * Serialise a room to Redis, stripping Node.js-only fields.
 * @param {Room} room
 */
async function _saveRoom(room) {
  const { _cleanupTimer, ...data } = room;
  const key = data.status === STATUS_PLAYING ? gameKey(data.roomId) : lobbyKey(data.roomId);
  const ttl = data.status === STATUS_PLAYING ? GAME_TTL : LOBBY_TTL;
  await redis.set(key, data, ttl);
}

// ---------------------------------------------------------------------------
// Room store functions (same signatures as rooms/roomStore.js)
// ---------------------------------------------------------------------------

/**
 * @param {Object} [options]
 * @returns {Promise<Room>}
 */
async function createRoom(options = {}) {
  const roomId = generateId();

  /** @type {Room} */
  const room = {
    roomId,
    players: [],
    maxPlayers: options.maxPlayers ?? DEFAULT_MAX_PLAYERS,
    status: STATUS_WAITING,
    isPrivate: options.isPrivate ?? false,
    passkey: options.passkey ?? null,
    creatorName: options.creatorName ?? 'Guest',
    game: null,
  };

  rooms[roomId] = room;
  await _saveRoom(room);

  return room;
}

/**
 * @param {string} roomId
 * @param {Player} player
 * @returns {Promise<{ success: boolean, room: Room|null, error: string|null }>}
 */
async function joinRoom(roomId, player) {
  const room = rooms[roomId];

  if (!room)                              return { success: false, room: null, error: 'Room not found' };
  if (room.status !== STATUS_WAITING)     return { success: false, room: null, error: 'Room is not accepting players' };
  if (room.players.length >= room.maxPlayers) return { success: false, room: null, error: 'Room is full' };

  room.players.push(player);
  await _saveRoom(room);

  return { success: true, room, error: null };
}

/**
 * Synchronous — only reads from in-memory store.
 * @param {string} roomId
 * @returns {Room|null}
 */
function getRoom(roomId) {
  return rooms[roomId] ?? null;
}

/**
 * Synchronous — only reads from in-memory store.
 * @returns {Room[]}
 */
function getAllRooms() {
  return Object.values(rooms);
}

/**
 * Synchronous — only reads from in-memory store.
 * @returns {Room[]}
 */
function getJoinableRooms() {
  return Object.values(rooms).filter(
    (room) =>
      room.status === STATUS_WAITING &&
      room.players.length < room.maxPlayers &&
      !room.isPrivate,
  );
}

/**
 * @param {string} roomId
 * @returns {Promise<{ success: boolean, room: Room|null, error: string|null }>}
 */
async function startGame(roomId) {
  const room = rooms[roomId];

  if (!room)                           return { success: false, room: null, error: 'Room not found' };
  if (room.status === STATUS_PLAYING)  return { success: false, room: null, error: 'Game already started' };

  room.status = STATUS_PLAYING;
  room.game = createInitialGameState(room.players);

  // Move from lobby key to game key
  await redis.del(lobbyKey(roomId));
  await _saveRoom(room);

  return { success: true, room, error: null };
}

/** @param {Player[]} players */
function createInitialGameState(players) {
  const turnOrder = shufflePlayers(players).map((p) => p.id);
  const { hands, deckCount } = dealCards(players);

  players.forEach((player) => {
    player.hand = hands[player.id] ?? [];
  });

  return {
    phase: 'bidding',
    currentTurnIndex: 0,
    turnOrder,
    deckCount,
    masterSuit: null,
    partner: { selectedCards: [], partners: [], revealed: false },
    currentStack: [],
    currentSuit: null,
    history: [],
    score: null,
    bidding: {
      currentBid: 0,
      highestBidder: null,
      currentTurnIndex: 0,
      bids: [],
    },
  };
}

/**
 * Synchronous — only mutates in-memory player reference.
 * @param {Room}   room
 * @param {string} oldSocketId
 * @param {string} newSocketId
 * @returns {boolean}
 */
function updatePlayerId(room, oldSocketId, newSocketId) {
  const player = room.players.find((p) => p.socketId === oldSocketId);
  if (!player) return false;
  player.socketId = newSocketId;
  return true;
}

/**
 * Synchronous — only mutates in-memory room reference.
 * @param {string} roomId
 * @param {string} socketId
 * @returns {{ success: boolean, error: string|null }}
 */
function removePlayerFromRoom(roomId, socketId) {
  const room = rooms[roomId];

  if (!room) return { success: false, error: 'Room not found' };
  if (room.status !== STATUS_WAITING) return { success: false, error: 'Cannot leave a game in progress' };

  const idx = room.players.findIndex((p) => p.socketId === socketId);
  if (idx === -1) return { success: false, error: 'Player not found in room' };

  room.players.splice(idx, 1);

  return { success: true, error: null };
}

/**
 * @param {string} roomId
 * @returns {Promise<void>}
 */
async function deleteRoom(roomId) {
  const room = rooms[roomId];
  if (room && room._cleanupTimer) {
    clearTimeout(room._cleanupTimer);
  }
  delete rooms[roomId];

  await Promise.all([
    redis.del(lobbyKey(roomId)),
    redis.del(gameKey(roomId)),
  ]);

  console.log(`Room ${roomId} removed from store.`);
}

/**
 * Synchronous — only reads from in-memory store.
 * @param {string} userId
 * @returns {{ room: Room, player: Player }|null}
 */
function findRoomByUserId(userId) {
  for (const room of Object.values(rooms)) {
    const player = room.players.find((p) => p.id === userId);
    if (player) return { room, player };
  }
  return null;
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayerFromRoom,
  getRoom,
  getAllRooms,
  getJoinableRooms,
  startGame,
  updatePlayerId,
  deleteRoom,
  findRoomByUserId,
};
