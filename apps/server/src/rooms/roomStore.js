'use strict';

const { generateId } = require('../utils/generateId');
const { shufflePlayers } = require('../utils/turnUtils');
const { dealCards } = require('../services/dealCards');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_PLAYERS = 5;

/** @type {'waiting'} */
const STATUS_WAITING = 'waiting';

/** @type {'playing'} */
const STATUS_PLAYING = 'playing';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/**
 * Central in-memory store for all active game rooms.
 * Key: roomId {string}
 * Value: room {Room}
 *
 * @type {Object.<string, Room>}
 */
const rooms = {};

// ---------------------------------------------------------------------------
// Type definitions (JSDoc only — no runtime overhead)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Player
 * @property {string}      id          - Stable UUID from auth — NEVER changes.
 * @property {string}      socketId    - Current socket ID — changes on reconnect.
 * @property {string}      username    - Display name of the player.
 * @property {Array}       hand        - Cards held by the player (empty until dealt).
 * @property {boolean}     isConnected - Whether the player's socket is active.
 * @property {boolean}     hasPassed   - Whether the player has passed this round.
 * @property {number|null} bid         - The player's current bid value.
 * @property {string|null} team        - The team the player belongs to.
 */

/**
 * @typedef {Object} BidEntry
 * @property {string} playerId - ID of the player who placed the bid.
 * @property {number} amount   - Bid amount placed.
 */

/**
 * @typedef {Object} BiddingState
 * @property {number}       currentBid       - Highest bid placed so far.
 * @property {string|null}  highestBidder    - Player ID of the current highest bidder.
 * @property {number}       currentTurnIndex - Index into turnOrder for whose turn it is to bid.
 * @property {BidEntry[]}   bids             - History of all bids placed this round.
 */

/**
 * @typedef {Object} PartnerState
 * @property {string[]}  selectedCards - Card strings chosen as partner identifiers.
 * @property {string[]}  partners      - Player IDs confirmed as partners (populated on reveal).
 * @property {boolean}   revealed      - Whether the partner has been publicly revealed.
 */

/**
 * @typedef {Object} GameState
 * @property {'bidding'|'partner-selection'|'playing'|'ended'} phase - Current phase of the game.
 * @property {number}        currentTurnIndex - Index into turnOrder for the active player.
 * @property {string[]}      turnOrder        - Ordered list of player IDs determining turn sequence.
 * @property {1|2}           deckCount        - Number of decks used in this game.
 * @property {BiddingState}  bidding          - State of the current bidding round.
 * @property {string|null}   masterSuit       - The trump suit chosen by the highest bidder.
 * @property {PartnerState}  partner          - Partner selection state.
 * @property {Array}         currentStack     - Cards played in the current round [{playerId, card}].
 * @property {string|null}   currentSuit      - Suit of the first card played in the current stack.
 * @property {Array}         history          - Completed stacks [{winner, cards}].
 * @property {{teamA:number,teamB:number}|null} score - Final scores; null until game ends.
 */

/**
 * @typedef {Object} Room
 * @property {string}   roomId      - Unique identifier for the room.
 * @property {Player[]} players     - List of players currently in the room.
 * @property {number}   maxPlayers  - Maximum number of players allowed.
 * @property {'waiting'|'playing'} status - Current status of the room.
 * @property {boolean}  isPrivate   - Whether the room is private (invite-only).
 * @property {string|null} passkey  - Passkey required to join; null for public rooms.
 * @property {string}   creatorName - Display name of the player who created the room.
 * @property {GameState|null} game  - Active game state; null until game starts.
 */

// ---------------------------------------------------------------------------
// Room store functions
// ---------------------------------------------------------------------------

/**
 * Creates a new game room and stores it in memory.
 *
 * @param {Object}  [options]                       - Optional room configuration.
 * @param {number}  [options.maxPlayers=5]          - Maximum players allowed in the room.
 * @param {boolean} [options.isPrivate=false]       - Whether the room is private.
 * @param {string}  [options.passkey=null]          - Passkey for private rooms.
 * @param {string}  [options.creatorName='Guest']   - Display name of the room creator.
 * @returns {Room} The newly created room object.
 */
function createRoom(options = {}) {
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

  return room;
}

/**
 * Adds a player to an existing room if the room exists and is not full.
 *
 * @param {string} roomId   - The ID of the room to join.
 * @param {Player} player   - The player object to add.
 * @returns {{ success: boolean, room: Room|null, error: string|null }}
 *   Result object indicating success or failure with a reason.
 */
function joinRoom(roomId, player) {
  const room = rooms[roomId];

  if (!room) {
    return { success: false, room: null, error: 'Room not found' };
  }

  if (room.status !== STATUS_WAITING) {
    return { success: false, room: null, error: 'Room is not accepting players' };
  }

  if (room.players.length >= room.maxPlayers) {
    return { success: false, room: null, error: 'Room is full' };
  }

  room.players.push(player);

  return { success: true, room, error: null };
}

/**
 * Retrieves a single room by its ID.
 *
 * @param {string} roomId - The ID of the room to retrieve.
 * @returns {Room|null} The room object, or null if not found.
 */
function getRoom(roomId) {
  return rooms[roomId] ?? null;
}

/**
 * Retrieves all rooms currently in memory.
 *
 * @returns {Room[]} Array of all room objects.
 */
function getAllRooms() {
  return Object.values(rooms);
}

/**
 * Retrieves rooms that are open for new players.
 *
 * A room is joinable when:
 *  - status is "waiting"
 *  - current player count is below maxPlayers
 *
 * @returns {Room[]} Array of joinable room objects.
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
 * Transitions a room from "waiting" to "playing" and initialises the game state.
 *
 * @param {string} roomId - The ID of the room to start.
 * @returns {{ success: boolean, room: Room|null, error: string|null }}
 *   Result object indicating success or failure with a reason.
 */
function startGame(roomId) {
  const room = rooms[roomId];

  if (!room) {
    return { success: false, room: null, error: 'Room not found' };
  }

  if (room.status === STATUS_PLAYING) {
    return { success: false, room: null, error: 'Game already started' };
  }

  room.status = STATUS_PLAYING;

  room.game = createInitialGameState(room.players);

  return { success: true, room, error: null };
}

/**
 * Creates the initial game state for a new game.
 *
 * Shuffles the player list to produce a random turn order. Keeping creation
 * isolated here ensures the shape is consistent across the codebase.
 *
 * @param {Player[]} players - The players in the room at game start.
 * @returns {GameState} The initial game state object.
 */
function createInitialGameState(players) {
  const turnOrder = shufflePlayers(players).map((player) => player.id);

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
    partner: {
      selectedCards: [],
      partners: [],
      revealed: false,
    },
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

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Updates a player's socketId when they reconnect with a new socket.
 *
 * player.id (stable UUID) is never changed — game state arrays
 * (turnOrder, highestBidder, partners, currentStack) reference player.id
 * and remain correct without any further patches.
 *
 * @param {Room}   room        - The room containing the player.
 * @param {string} oldSocketId - The socket ID being replaced.
 * @param {string} newSocketId - The new socket ID.
 * @returns {boolean} True if the player was found and updated, false otherwise.
 */
function updatePlayerId(room, oldSocketId, newSocketId) {
  const player = room.players.find((p) => p.socketId === oldSocketId);
  if (!player) return false;

  player.socketId = newSocketId;

  return true;
}

/**
 * Removes a player from a waiting room by socket ID.
 *
 * Only valid while the room is still in "waiting" status — players cannot
 * leave once a game has started.
 *
 * @param {string} roomId   - The ID of the room to leave.
 * @param {string} socketId - The socket ID of the player leaving.
 * @returns {{ success: boolean, error: string|null }} Result object.
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
 * Removes a room from the in-memory store and clears any pending cleanup timer.
 *
 * @param {string} roomId - The ID of the room to remove.
 * @returns {void}
 */
function deleteRoom(roomId) {
  const room = rooms[roomId];
  if (room && room._cleanupTimer) {
    clearTimeout(room._cleanupTimer);
  }
  delete rooms[roomId];
  console.log(`Room ${roomId} removed from store.`);
}

/**
 * Finds the room and player entry for a given stable user ID.
 *
 * Used by the INIT_PLAYER handler to auto-reconnect a returning player
 * without needing the client to supply a roomId.
 *
 * @param {string} userId - The stable UUID from auth (player.id).
 * @returns {{ room: Room, player: Player }|null} Match or null if not found.
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
