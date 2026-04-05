'use strict';

/**
 * Jack-Thief socket event handlers.
 *
 * Game lifecycle:
 *   pre-game (40s manual pair-discard) → playing (turn-based picks) → ended
 *
 * Turn flow in playing phase:
 *   1. Active player (currentPickerId) emits JT_SELECT_TARGET { targetPlayerId }
 *   2. 10-sec buffer starts → JT_TARGET_SELECTED broadcast
 *   3. Buffer expires → 20-sec pick window opens → JT_PICK_TIMER_START broadcast
 *   4. Active player emits JT_PICK_CARD (any time during pick window)
 *      OR 20-sec timer expires → turn auto-passes to target
 *   5. Turn passes to fromPlayerId → JT_TURN_UPDATE broadcast
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
 * @property {{ [id: string]: string[] }} hands         - Private card arrays
 * @property {{ [id: string]: number }}  handSizes       - Public counts
 * @property {{ [pickerId: string]: { [fromId: string]: number } }} pickCounts
 * @property {NodeJS.Timeout|null} preGameTimer
 * @property {boolean} picking                           - Mutex for pick race conditions
 * @property {string[]} winners
 * @property {string|null} loser
 * @property {string[]} activePlayers
 * @property {string|null} currentPickerId              - Whose turn it is
 * @property {string|null} targetPlayerId               - Selected target (after JT_SELECT_TARGET)
 * @property {NodeJS.Timeout|null} selectTimer          - 10-sec buffer timer
 * @property {NodeJS.Timeout|null} pickTimer            - 20-sec pick window timer
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
}

// ---------------------------------------------------------------------------
// Pre-game timer expiry (Issue #1: no auto-discard)
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

  // Defensive: check for any immediately-empty hands
  checkAndEmitWinners(io, roomId, state).catch((err) =>
    console.error('endPreGame win-check error:', err),
  );

  console.log(`JT pre-game ended in room ${roomId}`);
}

// ---------------------------------------------------------------------------
// Playing: select target (Issue #2, #4)
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

  // Only the active picker can select a target
  if (pickerId !== state.currentPickerId) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'It is not your turn' });
  }

  // Already selected a target
  if (state.targetPlayerId !== null) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Target already selected' });
  }

  const validationErr = jtService.validatePickTarget(state, pickerId, targetPlayerId);
  if (validationErr) return socket.emit(JT_EVENTS.JT_ERROR, { message: validationErr });

  state.targetPlayerId = targetPlayerId;

  io.to(roomId).emit(JT_EVENTS.JT_TARGET_SELECTED, {
    currentPickerId: pickerId,
    targetPlayerId,
    bufferDuration: JT_RULES.SELECT_TARGET_BUFFER_MS / 1000,
  });

  // 10-sec buffer before pick window opens
  state.selectTimer = setTimeout(() => {
    state.selectTimer = null;

    // Check target is still active (may have won during buffer — edge case)
    if (!state.activePlayers.includes(targetPlayerId)) {
      state.targetPlayerId = null;
      io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, { currentPickerId: state.currentPickerId, targetPlayerId: null });
      return;
    }

    io.to(roomId).emit(JT_EVENTS.JT_PICK_TIMER_START, {
      duration: JT_RULES.PICK_CARD_DURATION_MS / 1000,
    });

    // 20-sec pick window — auto-pass on expiry
    state.pickTimer = setTimeout(() => {
      state.pickTimer = null;
      const prevTarget = state.targetPlayerId;
      state.targetPlayerId = null;
      state.currentPickerId = prevTarget;
      io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, {
        currentPickerId: state.currentPickerId,
        targetPlayerId: null,
      });
      console.log(`JT pick timer expired in room ${roomId}, turn passed to ${prevTarget}`);
    }, JT_RULES.PICK_CARD_DURATION_MS);

  }, JT_RULES.SELECT_TARGET_BUFFER_MS);
}

// ---------------------------------------------------------------------------
// Playing: pick card (Issue #2, #3, #4)
// ---------------------------------------------------------------------------

async function handlePickCard(socket, io, payload) {
  if (!payload || typeof payload.roomId !== 'string' || typeof payload.fromPlayerId !== 'string') {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'roomId and fromPlayerId are required' });
  }

  const { roomId, fromPlayerId, cardIndex = 0 } = payload;
  const pickerId = socket.authUser.id;

  const state = jackThiefGames.get(roomId);
  if (!state) return socket.emit(JT_EVENTS.JT_ERROR, { message: 'Game not found' });

  // Turn validation
  if (pickerId !== state.currentPickerId) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'It is not your turn' });
  }

  // Must have selected this target
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

  // Mutex
  if (state.picking) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'A pick is in progress, try again' });
  }

  const err = jtService.validatePick(state, pickerId, fromPlayerId);
  if (err) return socket.emit(JT_EVENTS.JT_ERROR, { message: err });

  // Cancel the 20-sec timer since player picked in time
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

  // Issue #3: send updated hand to BOTH the picker AND the player picked from
  socket.emit(JT_EVENTS.JT_HAND_UPDATE, { hand: [...state.hands[pickerId]] });

  const room = getRoom(roomId);
  const fromPlayerSocket = room?.players.find((p) => p.id === fromPlayerId);
  if (fromPlayerSocket) {
    const fromSock = io.sockets.sockets.get(fromPlayerSocket.socketId);
    if (fromSock) {
      fromSock.emit(JT_EVENTS.JT_HAND_UPDATE, { hand: [...state.hands[fromPlayerId]] });
    }
  }

  // Turn passes to the player who was just picked from
  state.currentPickerId = fromPlayerId;

  await checkAndEmitWinners(io, roomId, state);

  // If game ended, checkAndEmitWinners already handled cleanup
  if (state.phase === 'ended') return;

  // If the new currentPickerId is no longer active (won), advance to next active player
  if (!state.activePlayers.includes(state.currentPickerId)) {
    state.currentPickerId = state.activePlayers[0];
  }

  io.to(roomId).emit(JT_EVENTS.JT_TURN_UPDATE, {
    currentPickerId: state.currentPickerId,
    targetPlayerId: null,
  });
}

// ---------------------------------------------------------------------------
// Reorder hand (Issue #5)
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

  // Validate the order array
  if (cardOrder.length !== hand.length) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'cardOrder length mismatch' });
  }
  const sorted = [...cardOrder].sort((a, b) => a - b);
  const isValid = sorted.every((v, i) => v === i) && new Set(cardOrder).size === hand.length;
  if (!isValid) {
    return socket.emit(JT_EVENTS.JT_ERROR, { message: 'cardOrder must be a valid permutation' });
  }

  state.hands[playerId] = cardOrder.map((i) => hand[i]);
  // No broadcast needed — hand sizes don't change, content is private
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

  // Cancel any outstanding timers
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
    // Reconstruct timer states so client can resume UI
    bufferActive: state.selectTimer !== null,
    pickWindowActive: state.pickTimer !== null,
  });
}

function getJTGame(roomId) {
  return jackThiefGames.get(roomId);
}

module.exports = { registerJackThiefHandlers, handleJTRejoin, getJTGame };
