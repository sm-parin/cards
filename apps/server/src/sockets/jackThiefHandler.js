'use strict';

/**
 * Jack-Thief socket event handlers.
 *
 * Manages the full Jack-Thief game lifecycle:
 *   pre-game (40-second pair-discard phase) → playing (free-for-all picks) → ended
 *
 * Game state is stored in the module-level `jackThiefGames` map, keyed by roomId.
 * The existing room store handles lobby, player list, and reconnect; this module
 * handles everything after JT_START_GAME.
 *
 * @module sockets/jackThiefHandler
 */

const { getRoom, deleteRoom } = require('../db/roomStore');
const { JT_EVENTS, JT_RULES } = require('../config/constants');
const jtService = require('../services/jackThiefService');
const { updateCoins } = require('../store/userStore');
const { generateId } = require('../utils/generateId');

// ---------------------------------------------------------------------------
// In-memory game state
// ---------------------------------------------------------------------------

/**
 * Active Jack-Thief games, keyed by roomId.
 *
 * @type {Map<string, JtGameState>}
 *
 * @typedef {object} JtGameState
 * @property {'pre-game'|'playing'|'ended'} phase
 * @property {1|2}    deckCount
 * @property {{ [id: string]: string[] }} hands       - Private card arrays
 * @property {{ [id: string]: number }}  handSizes    - Public counts
 * @property {{ [pickerId: string]: { [fromId: string]: number } }} pickCounts
 * @property {NodeJS.Timeout|null} preGameTimer
 * @property {boolean} picking                        - Mutex for pick race conditions
 * @property {string[]} winners                       - playerIds with empty hand
 * @property {string|null} loser                      - Jack holder at game end
 * @property {string[]} activePlayers                 - playerIds still in game
 */
const jackThiefGames = new Map();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all Jack-Thief event handlers on the given socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerJackThiefHandlers(socket, io) {
  socket.on(JT_EVENTS.JT_START_GAME, (payload) =>
    handleStartGame(socket, io, payload).catch((err) => {
      console.error('JT_START_GAME error:', err);
      socket.emit(JT_EVENTS.JT_ERROR, { message: 'Internal server error' });
    }),
  );

  socket.on(JT_EVENTS.JT_DISCARD_PAIR, (payload) =>
    handleDiscardPair(socket, io, payload),
  );

  socket.on(JT_EVENTS.JT_PICK_CARD, (payload) =>
    handlePickCard(socket, io, payload).catch((err) => {
      console.error('JT_PICK_CARD error:', err);
      socket.emit(JT_EVENTS.JT_ERROR, { message: 'Internal server error' });
    }),
  );
}

// ---------------------------------------------------------------------------
// Start game
// ---------------------------------------------------------------------------

async function handleStartGame(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string') {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId is required' });
  }

  const { roomId } = payload;
  const room = getRoom(roomId);

  if (!room) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Room not found' });
  if (room.status !== 'waiting') return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game already started' });

  // Only the creator (first player) can start
  if (!room.players.length || room.players[0].id !== socket.authUser.id) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Only the room creator can start the game' });
  }

  if (room.players.length < JT_RULES.MIN_PLAYERS) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: `Need at least ${JT_RULES.MIN_PLAYERS} players to start` });
  }

  const playerIds = room.players.map((p) => p.id);
  const deckCount = jtService.getDeckCount(playerIds.length);
  const deck = jtService.createDeck(deckCount);
  const hands = jtService.dealCards(playerIds, deck);

  const handSizes = {};
  playerIds.forEach((id) => { handSizes[id] = hands[id].length; });

  /** @type {JtGameState} */
  const state = {
    phase: 'pre-game',
    deckCount,
    hands,
    handSizes,
    pickCounts: {},
    preGameTimer: null,
    picking: false,
    winners: [],
    loser: null,
    activePlayers: [...playerIds],
  };

  jackThiefGames.set(roomId, state);
  room.status = 'playing';

  // Send private hands to each player
  for (const player of room.players) {
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.emit(JT_EVENTS.JT_PLAYER_HAND, { hand: hands[player.id] });
    }
  }

  // Broadcast game started (public info)
  io.to(roomId).emit(JT_EVENTS.JT_GAME_STARTED, {
    handSizes: { ...handSizes },
    deckCount,
    duration: JT_RULES.PRE_GAME_DURATION_MS / 1000,
  });

  // Start 40-second pre-game timer
  state.preGameTimer = setTimeout(
    () => endPreGame(io, roomId),
    JT_RULES.PRE_GAME_DURATION_MS,
  );

  console.log(`JT game started in room ${roomId} (${playerIds.length} players, ${deckCount} deck)`);
}

// ---------------------------------------------------------------------------
// Pre-game: discard pairs
// ---------------------------------------------------------------------------

function handleDiscardPair(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || !Array.isArray(payload.cards) || payload.cards.length !== 2) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and cards[2] are required' });
  }

  const { roomId, cards } = payload;
  const [card1, card2] = cards;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });
  if (state.phase !== 'pre-game') return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Pairs can only be discarded during pre-game' });

  const playerId = socket.authUser.id;
  const hand = state.hands[playerId];
  if (!hand) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'You are not in this game' });

  // Validate same rank
  if (jtService.getRank(card1) !== jtService.getRank(card2)) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Cards are not a matching pair' });
  }

  // Find distinct indices (handles duplicate card strings in 2-deck games)
  const idx1 = hand.indexOf(card1);
  if (idx1 === -1) return socket.emit(JT_EVENTS.JT_ERROR, { message: `${card1} is not in your hand` });

  const idx2 = hand.findIndex((c, i) => c === card2 && i !== idx1);
  if (idx2 === -1) return socket.emit(JT_EVENTS.JT_ERROR, { message: `No second ${card2} in your hand` });

  // Remove both cards
  state.hands[playerId] = hand.filter((_, i) => i !== idx1 && i !== idx2);
  state.handSizes[playerId] = state.hands[playerId].length;

  io.to(roomId).emit(JT_EVENTS.JT_PAIR_DISCARDED, {
    playerId,
    pair: [card1, card2],
    newHandSizes: { ...state.handSizes },
  });
}

// ---------------------------------------------------------------------------
// Pre-game timer expiry
// ---------------------------------------------------------------------------

/**
 * Called when the 40-second pre-game timer fires.
 * Auto-discards all remaining pairs and transitions to playing phase.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 */
function endPreGame(io, roomId) {
  const state = jackThiefGames.get(roomId);
  if (!state || state.phase !== 'pre-game') return;

  state.preGameTimer = null;

  // Auto-discard remaining pairs for each player
  for (const playerId of state.activePlayers) {
    const { newHand, discarded } = jtService.discardAllPairs(state.hands[playerId]);
    state.hands[playerId] = newHand;
    state.handSizes[playerId] = newHand.length;

    for (const pair of discarded) {
      io.to(roomId).emit(JT_EVENTS.JT_PAIR_DISCARDED, {
        playerId,
        pair,
        newHandSizes: { ...state.handSizes },
      });
    }
  }

  state.phase = 'playing';
  io.to(roomId).emit(JT_EVENTS.JT_PRE_GAME_ENDED, { handSizes: { ...state.handSizes } });

  // Handle edge case: a player had all pairs and an empty hand immediately
  checkAndEmitWinners(io, roomId, state).catch((err) =>
    console.error('endPreGame win-check error:', err),
  );

  console.log(`JT pre-game ended in room ${roomId}`);
}

// ---------------------------------------------------------------------------
// Playing: pick cards
// ---------------------------------------------------------------------------

async function handlePickCard(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || typeof payload.fromPlayerId !== 'string') {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and fromPlayerId are required' });
  }

  const { roomId, fromPlayerId, cardIndex = 0 } = payload;
  const pickerId = socket.authUser.id;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });

  // Mutex: prevent simultaneous picks corrupting state
  if (state.picking) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'A pick is in progress, try again in a moment' });
  }

  const err = jtService.validatePick(state, pickerId, fromPlayerId);
  if (err) return socket.emit(JT_EVENTS.JT_ERROR, { message: err });

  state.picking = true;

  const { card, paired, discardedPair } = jtService.resolvePick(
    state,
    pickerId,
    fromPlayerId,
    typeof cardIndex === 'number' ? cardIndex : 0,
  );

  state.picking = false;

  // Broadcast pick result to all players in room
  io.to(roomId).emit(JT_EVENTS.JT_CARD_PICKED, {
    pickerId,
    fromPlayerId,
    card,
    paired,
    discardedPair: discardedPair ?? null,
    newHandSizes: { ...state.handSizes },
  });

  // Send private updated hand to the picker only
  socket.emit(JT_EVENTS.JT_HAND_UPDATE, { hand: [...state.hands[pickerId]] });

  await checkAndEmitWinners(io, roomId, state);
}

// ---------------------------------------------------------------------------
// Win/end detection
// ---------------------------------------------------------------------------

/**
 * Checks for newly-empty hands, emits JT_PLAYER_WON, and ends the game if only
 * one active player remains.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 * @param {JtGameState} state
 */
async function checkAndEmitWinners(io, roomId, state) {
  const newWinners = jtService.checkNewWinners(state);

  for (const winnerId of newWinners) {
    if (!state.winners.includes(winnerId)) {
      state.winners.push(winnerId);
      state.activePlayers = state.activePlayers.filter((id) => id !== winnerId);
      io.to(roomId).emit(JT_EVENTS.JT_PLAYER_WON, {
        playerId: winnerId,
        winners: [...state.winners],
      });
      console.log(`JT player ${winnerId} won in room ${roomId}`);
    }
  }

  const { gameOver, loser } = jtService.checkGameOver(state);
  if (!gameOver) return;

  state.phase = 'ended';
  state.loser = loser;

  const matchId = generateId();
  const coinDeltas = {};

  // Apply coin changes
  const allPlayers = [...state.winners, ...(loser ? [loser] : [])];
  for (const winnerId of state.winners) {
    coinDeltas[winnerId] = JT_RULES.WIN_COINS;
    try {
      await updateCoins(winnerId, JT_RULES.WIN_COINS, 'jack_thief_win', matchId);
    } catch (e) {
      console.error(`Failed to update coins for winner ${winnerId}:`, e);
    }
  }
  if (loser) {
    coinDeltas[loser] = JT_RULES.LOSE_COINS;
    try {
      await updateCoins(loser, JT_RULES.LOSE_COINS, 'jack_thief_lose', matchId);
    } catch (e) {
      console.error(`Failed to update coins for loser ${loser}:`, e);
    }
  }

  io.to(roomId).emit(JT_EVENTS.JT_GAME_ENDED, {
    loser,
    winners: [...state.winners],
    coinDeltas,
    matchId,
  });

  jackThiefGames.delete(roomId);
  deleteRoom(roomId).catch((err) => console.error('JT deleteRoom error:', err));
  console.log(`JT game ended in room ${roomId}. Loser: ${loser}`);
}

// ---------------------------------------------------------------------------
// Reconnect support (called from sockets/index.js on INIT_PLAYER)
// ---------------------------------------------------------------------------

/**
 * Sends current JT game state to a reconnecting player.
 * Called after the player is re-joined to the socket room in index.js.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} roomId
 */
function handleJTRejoin(socket, roomId) {
  const state = jackThiefGames.get(roomId);
  if (!state) return;

  const playerId = socket.authUser.id;

  // Restore private hand
  if (state.hands[playerId]) {
    socket.emit(JT_EVENTS.JT_PLAYER_HAND, { hand: [...state.hands[playerId]] });
  }

  // Restore public game state
  socket.emit(JT_EVENTS.JT_GAME_STATE, {
    phase: state.phase,
    deckCount: state.deckCount,
    handSizes: { ...state.handSizes },
    winners: [...state.winners],
    activePlayers: [...state.activePlayers],
    pickCounts: JSON.parse(JSON.stringify(state.pickCounts)),
    duration: JT_RULES.PRE_GAME_DURATION_MS / 1000,
  });
}

/**
 * Returns the JT game state for a room, or undefined if none exists.
 *
 * @param {string} roomId
 * @returns {JtGameState|undefined}
 */
function getJTGame(roomId) {
  return jackThiefGames.get(roomId);
}

module.exports = { registerJackThiefHandlers, handleJTRejoin, getJTGame };
