'use strict';

/**
 * Jack-Thief socket event handlers.
 *
 * Game lifecycle:
 *   pre-game (40s manual pair-discard) → playing (turn-based picks) → ended
 *
 * Turn flow in playing phase:
 *   1. Turn assigned → JT_SELECT_PLAYER_TIMER_START (10s to choose target)
 *      • Player selects target early → cancel timer → go to step 2
 *      • Timer expires → auto-select random active player → go to step 2
 *   2. JT_TARGET_SELECTED → 5s buffer → JT_PICK_TIMER_START (10s pick window)
 *   3. Player picks card → JT_CARD_PICKED + next turn
 *      OR 10s timer expires → skip pick, advance turn to target
 *
 * Pair discard (JT_DISCARD_PAIR) is allowed in both pre-game and playing,
 * EXCEPT when the player is the current pick target during the pick window.
 *
 * No auto-discard: picked cards are simply added to hand. Manual discard only.
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
 * @property {{ [id: string]: string[] }} hands          - Private card arrays
 * @property {{ [id: string]: number }}  handSizes        - Public counts
 * @property {{ [pickerId: string]: { [fromId: string]: number } }} pickCounts
 * @property {NodeJS.Timeout|null} preGameTimer
 * @property {boolean} picking                            - Mutex for pick race conditions
 * @property {string[]} winners
 * @property {string|null} loser
 * @property {string[]} activePlayers
 * @property {string|null} currentPickerId               - Whose turn it is
 * @property {string|null} targetPlayerId                - Selected target (phase 2+)
 * @property {NodeJS.Timeout|null} selectPlayerTimer     - 10s "choose a player" timer
 * @property {NodeJS.Timeout|null} selectTimer           - 5s buffer timer
 * @property {NodeJS.Timeout|null} pickTimer             - 10s pick window timer
 */
const jackThiefGames = new Map();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

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

  socket.on(JT_EVENTS.JT_SELECT_TARGET, (payload) =>
    handleSelectTarget(socket, io, payload),
  );

  socket.on(JT_EVENTS.JT_PICK_CARD, (payload) =>
    handlePickCard(socket, io, payload).catch((err) => {
      console.error('JT_PICK_CARD error:', err);
      socket.emit(JT_EVENTS.JT_ERROR, { message: 'Internal server error' });
    }),
  );

  socket.on(JT_EVENTS.JT_REORDER_HAND, (payload) =>
    handleReorderHand(socket, payload),
  );
}

// ---------------------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------------------

/**
 * Phase 1: Start 10s timer for current picker to select a target.
 * If only one eligible player exists, skip Phase 1 entirely and auto-select immediately.
 * If target not selected in time, auto-selects a random active player (not self).
 */
function startSelectPlayerTimer(io, roomId, state) {
  if (state.selectPlayerTimer) {
    clearTimeout(state.selectPlayerTimer);
    state.selectPlayerTimer = null;
  }

  const candidates = state.activePlayers.filter((id) => id !== state.currentPickerId);

  // With only 1 eligible target (e.g. 2-player game), skip Phase 1 entirely
  if (candidates.length === 1) {
    startBuffer(io, roomId, state, state.currentPickerId, candidates[0]);
    return;
  }

  io.to(roomId).emit(JT_EVENTS.JT_SELECT_PLAYER_TIMER_START, {
    currentPickerId: state.currentPickerId,
    duration: JT_RULES.SELECT_PLAYER_DURATION_MS / 1000,
  });

  state.selectPlayerTimer = setTimeout(() => {
    state.selectPlayerTimer = null;

    // Already has a target (rare race) — skip auto-select
    if (state.targetPlayerId !== null) return;

    // Pick a random active player that isn't the current picker
    const remaining = state.activePlayers.filter((id) => id !== state.currentPickerId);
    if (remaining.length === 0) return; // only 1 player left — game should already be over

    const autoTarget = remaining[Math.floor(Math.random() * remaining.length)];
    startBuffer(io, roomId, state, state.currentPickerId, autoTarget);
  }, JT_RULES.SELECT_PLAYER_DURATION_MS);
}

/**
 * Phase 2: Lock in target and start 5s buffer.
 * Called from both handleSelectTarget (manual) and selectPlayerTimer expiry (auto).
 */
function startBuffer(io, roomId, state, pickerId, targetPlayerId) {
  state.targetPlayerId = targetPlayerId;

  io.to(roomId).emit(JT_EVENTS.JT_TARGET_SELECTED, {
    currentPickerId: pickerId,
    targetPlayerId,
    bufferDuration: JT_RULES.SELECT_TARGET_BUFFER_MS / 1000,
  });

  state.selectTimer = setTimeout(() => {
    state.selectTimer = null;

    // Target may have won during buffer (edge case)
    if (!state.activePlayers.includes(targetPlayerId)) {
      state.targetPlayerId = null;
      io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, {
        currentPickerId: state.currentPickerId,
        targetPlayerId: null,
      });
      startSelectPlayerTimer(io, roomId, state);
      return;
    }

    io.to(roomId).emit(JT_EVENTS.JT_PICK_TIMER_START, {
      duration: JT_RULES.PICK_CARD_DURATION_MS / 1000,
    });

    // Phase 3: 10s pick window — skips pick on expiry, turn passes to target
    state.pickTimer = setTimeout(() => {
      state.pickTimer = null;
      const prevTarget = state.targetPlayerId;
      state.targetPlayerId = null;
      state.currentPickerId = prevTarget;

      io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, {
        currentPickerId: state.currentPickerId,
        targetPlayerId: null,
      });

      console.log(`JT pick timer expired in room ${roomId}, turn skipped → ${prevTarget}`);
      startSelectPlayerTimer(io, roomId, state);
    }, JT_RULES.PICK_CARD_DURATION_MS);
  }, JT_RULES.SELECT_TARGET_BUFFER_MS);
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

  const firstPickerId = playerIds[0];

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
    currentPickerId: firstPickerId,
    targetPlayerId: null,
    selectPlayerTimer: null,
    selectTimer: null,
    pickTimer: null,
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

  io.to(roomId).emit(JT_EVENTS.JT_GAME_STARTED, {
    handSizes: { ...handSizes },
    deckCount,
    duration: JT_RULES.PRE_GAME_DURATION_MS / 1000,
    currentPickerId: firstPickerId,
  });

  // 40-second pre-game timer
  state.preGameTimer = setTimeout(
    () => endPreGame(io, roomId),
    JT_RULES.PRE_GAME_DURATION_MS,
  );

  console.log(`JT game started in room ${roomId} (${playerIds.length} players, ${deckCount} deck)`);
}

// ---------------------------------------------------------------------------
// Pre-game and playing phase: discard pairs
// ---------------------------------------------------------------------------

function handleDiscardPair(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || !Array.isArray(payload.cards) || payload.cards.length !== 2) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and cards[2] are required' });
  }

  const { roomId, cards } = payload;
  const [card1, card2] = cards;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });
  if (state.phase === 'ended') return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game has ended' });

  const playerId = socket.authUser.id;
  const hand = state.hands[playerId];
  if (!hand) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'You are not in this game' });

  // Discard is blocked while the pick window is open and this player is the target
  if (state.phase === 'playing' && state.targetPlayerId === playerId && state.pickTimer !== null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Cannot discard pairs while being picked from' });
  }

  if (jtService.getRank(card1) !== jtService.getRank(card2)) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Cards are not a matching pair' });
  }

  const idx1 = hand.indexOf(card1);
  if (idx1 === -1) return socket.emit(JT_EVENTS.JT_ERROR, { message: `${card1} is not in your hand` });

  const idx2 = hand.findIndex((c, i) => c === card2 && i !== idx1);
  if (idx2 === -1) return socket.emit(JT_EVENTS.JT_ERROR, { message: `No second ${card2} in your hand` });

  state.hands[playerId] = hand.filter((_, i) => i !== idx1 && i !== idx2);
  state.handSizes[playerId] = state.hands[playerId].length;

  io.to(roomId).emit(JT_EVENTS.JT_PAIR_DISCARDED, {
    playerId,
    pair: [card1, card2],
    newHandSizes: { ...state.handSizes },
  });

  // During playing phase, discarding may empty hand → check for winners
  if (state.phase === 'playing') {
    checkAndEmitWinners(io, roomId, state).catch((err) =>
      console.error('discardPair win-check error:', err),
    );
  }
}

// ---------------------------------------------------------------------------
// Pre-game timer expiry — no auto-discard; cards stay as-is
// ---------------------------------------------------------------------------

function endPreGame(io, roomId) {
  const state = jackThiefGames.get(roomId);
  if (!state || state.phase !== 'pre-game') return;

  state.preGameTimer = null;
  state.phase = 'playing';

  io.to(roomId).emit(JT_EVENTS.JT_PRE_GAME_ENDED, {
    handSizes: { ...state.handSizes },
    currentPickerId: state.currentPickerId,
  });

  checkAndEmitWinners(io, roomId, state).catch((err) =>
    console.error('endPreGame win-check error:', err),
  );

  // Start Phase 1: active picker has 10s to choose a player
  startSelectPlayerTimer(io, roomId, state);

  console.log(`JT pre-game ended in room ${roomId}`);
}

// ---------------------------------------------------------------------------
// Playing: select target — manual target selection (Phase 1 → Phase 2)
// ---------------------------------------------------------------------------

function handleSelectTarget(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || typeof payload.targetPlayerId !== 'string') {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and targetPlayerId are required' });
  }

  const { roomId, targetPlayerId } = payload;
  const pickerId = socket.authUser.id;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });
  if (state.phase !== 'playing') return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game is not in playing phase' });

  if (pickerId !== state.currentPickerId) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'It is not your turn' });
  }

  if (state.targetPlayerId !== null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Target already selected' });
  }

  // selectPlayerTimer must be active (Phase 1 window must be open)
  if (state.selectPlayerTimer === null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Target selection window has closed' });
  }

  const validationErr = jtService.validatePickTarget(state, pickerId, targetPlayerId);
  if (validationErr) return socket.emit(JT_EVENTS.JT_ERROR, { message: validationErr });

  // Cancel Phase 1 timer — player selected early
  clearTimeout(state.selectPlayerTimer);
  state.selectPlayerTimer = null;

  startBuffer(io, roomId, state, pickerId, targetPlayerId);
}

// ---------------------------------------------------------------------------
// Playing: pick card — Phase 3
// ---------------------------------------------------------------------------

async function handlePickCard(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || typeof payload.fromPlayerId !== 'string') {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and fromPlayerId are required' });
  }

  const { roomId, fromPlayerId, cardIndex = 0 } = payload;
  const pickerId = socket.authUser.id;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });

  if (pickerId !== state.currentPickerId) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'It is not your turn' });
  }

  if (fromPlayerId !== state.targetPlayerId) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Pick from the selected target only' });
  }

  // Buffer must have expired
  if (state.selectTimer !== null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Wait for the buffer to end before picking' });
  }

  // Pick window must be open
  if (state.pickTimer === null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'No active pick window' });
  }

  if (state.picking) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'A pick is in progress, try again' });
  }

  const err = jtService.validatePick(state, pickerId, fromPlayerId);
  if (err) return socket.emit(JT_EVENTS.JT_ERROR, { message: err });

  // Cancel the 10-sec timer — player picked in time
  clearTimeout(state.pickTimer);
  state.pickTimer = null;
  state.targetPlayerId = null;

  state.picking = true;

  const { card, paired, discardedPair } = jtService.resolvePick(
    state,
    pickerId,
    fromPlayerId,
    typeof cardIndex === 'number' ? cardIndex : 0,
  );

  state.picking = false;

  io.to(roomId).emit(JT_EVENTS.JT_CARD_PICKED, {
    pickerId,
    fromPlayerId,
    card,
    paired,
    discardedPair: discardedPair ?? null,
    newHandSizes: { ...state.handSizes },
  });

  // Send updated hand to BOTH picker and picked-from player (fixes card sync)
  socket.emit(JT_EVENTS.JT_HAND_UPDATE, { hand: [...state.hands[pickerId]] });

  const room = getRoom(roomId);
  const fromPlayerEntry = room?.players.find((p) => p.id === fromPlayerId);
  if (fromPlayerEntry) {
    const fromSock = io.sockets.sockets.get(fromPlayerEntry.socketId);
    if (fromSock) {
      fromSock.emit(JT_EVENTS.JT_HAND_UPDATE, { hand: [...state.hands[fromPlayerId]] });
    }
  }

  // Turn passes to the player who was picked from
  state.currentPickerId = fromPlayerId;

  await checkAndEmitWinners(io, roomId, state);
  if (state.phase === 'ended') return;

  // If new picker is no longer active (won), advance to next active player
  if (!state.activePlayers.includes(state.currentPickerId)) {
    state.currentPickerId = state.activePlayers[0];
  }

  io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, {
    currentPickerId: state.currentPickerId,
    targetPlayerId: null,
  });

  startSelectPlayerTimer(io, roomId, state);
}

// ---------------------------------------------------------------------------
// Reorder hand
// ---------------------------------------------------------------------------

function handleReorderHand(socket, payload) {
  if (!payload || typeof payload.roomId !== 'string' || !Array.isArray(payload.cardOrder)) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and cardOrder[] are required' });
  }

  const { roomId, cardOrder } = payload;
  const playerId = socket.authUser.id;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });

  if (state.phase === 'ended') return;

  const hand = state.hands[playerId];
  if (!hand) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'You are not in this game' });

  // Disallow reordering if you are the target and pick window is open
  if (playerId === state.targetPlayerId && state.pickTimer !== null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Cannot reorder cards while being picked from' });
  }

  if (cardOrder.length !== hand.length) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'cardOrder length mismatch' });
  }
  const sorted = [...cardOrder].sort((a, b) => a - b);
  const isValid = sorted.every((v, i) => v === i) && new Set(cardOrder).size === hand.length;
  if (!isValid) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'cardOrder must be a valid permutation' });
  }

  state.hands[playerId] = cardOrder.map((i) => hand[i]);
}

// ---------------------------------------------------------------------------
// Win/end detection
// ---------------------------------------------------------------------------

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

  // Cancel all outstanding timers
  if (state.preGameTimer) { clearTimeout(state.preGameTimer); state.preGameTimer = null; }
  if (state.selectPlayerTimer) { clearTimeout(state.selectPlayerTimer); state.selectPlayerTimer = null; }
  if (state.selectTimer) { clearTimeout(state.selectTimer); state.selectTimer = null; }
  if (state.pickTimer) { clearTimeout(state.pickTimer); state.pickTimer = null; }

  const matchId = generateId();
  const coinDeltas = {};

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
// Reconnect support
// ---------------------------------------------------------------------------

function handleJTRejoin(socket, roomId) {
  const state = jackThiefGames.get(roomId);
  if (!state) return;

  const playerId = socket.authUser.id;

  if (state.hands[playerId]) {
    socket.emit(JT_EVENTS.JT_PLAYER_HAND, { hand: [...state.hands[playerId]] });
  }

  socket.emit(JT_EVENTS.JT_GAME_STATE, {
    phase: state.phase,
    deckCount: state.deckCount,
    handSizes: { ...state.handSizes },
    winners: [...state.winners],
    activePlayers: [...state.activePlayers],
    pickCounts: JSON.parse(JSON.stringify(state.pickCounts)),
    duration: JT_RULES.PRE_GAME_DURATION_MS / 1000,
    currentPickerId: state.currentPickerId,
    targetPlayerId: state.targetPlayerId,
    selectPlayerActive: state.selectPlayerTimer !== null,
    bufferActive: state.selectTimer !== null,
    pickWindowActive: state.pickTimer !== null,
  });
}

function getJTGame(roomId) {
  return jackThiefGames.get(roomId);
}

module.exports = { registerJackThiefHandlers, handleJTRejoin, getJTGame };
