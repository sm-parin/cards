'use strict';

const { getRoom, deleteRoom } = require('../db/roomStore');
const {
  validateBid,
  recordBid,
  recordPass,
  advanceBiddingTurn,
  getCurrentBidder,
  isMaxBidReached,
  haveAllOthersPassed,
  haveAllPassed,
  endBidding,
} = require('../services/biddingService');
const { recordMatch } = require('../services/matchRecorder');
const { EVENTS } = require('../config/constants');

/**
 * Registers bidding-phase socket event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
function registerBiddingHandlers(socket, io) {
  socket.on(EVENTS.PLACE_BID, (payload) => handlePlaceBid(socket, io, payload));
  socket.on(EVENTS.PASS_BID,  (payload) => handlePassBid(socket, io, payload).catch((err) => {
    console.error('PASS_BID error:', err);
    socket.emit(EVENTS.ERROR, { message: 'Internal server error' });
  }));
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handlePlaceBid(socket, io, payload) {
  const payloadError = validateBidPayload(payload);
  if (payloadError) {
    socket.emit(EVENTS.ERROR, { message: payloadError });
    return;
  }

  const { roomId, amount } = payload;
  const room = getRoom(roomId);

  const phaseError = assertBiddingPhase(room);
  if (phaseError) {
    socket.emit(EVENTS.ERROR, { message: phaseError });
    return;
  }

  const turnError = assertPlayerTurn(room, socket.authUser.id);
  if (turnError) {
    socket.emit(EVENTS.ERROR, { message: turnError });
    return;
  }

  const bidError = validateBid(amount, room.game.bidding.currentBid, room.game.deckCount);
  if (bidError) {
    socket.emit(EVENTS.ERROR, { message: bidError });
    return;
  }

  const player = getPlayerById(room, socket.authUser.id);
  recordBid(room, player, amount);

  console.log(`Player ${socket.authUser.id} bid ${amount} in room ${roomId}`);

  if (isMaxBidReached(amount, room.game.deckCount)) {
    finaliseBidding(io, room, roomId);
    return;
  }

  advanceBiddingTurn(room);
  emitBidUpdate(io, room, roomId);
}

async function handlePassBid(socket, io, payload) {
  const payloadError = validatePassPayload(payload);
  if (payloadError) {
    socket.emit(EVENTS.ERROR, { message: payloadError });
    return;
  }

  const { roomId } = payload;
  const room = getRoom(roomId);

  const phaseError = assertBiddingPhase(room);
  if (phaseError) {
    socket.emit(EVENTS.ERROR, { message: phaseError });
    return;
  }

  const turnError = assertPlayerTurn(room, socket.authUser.id);
  if (turnError) {
    socket.emit(EVENTS.ERROR, { message: turnError });
    return;
  }

  const player = getPlayerById(room, socket.authUser.id);
  recordPass(player);

  console.log(`Player ${socket.authUser.id} passed in room ${roomId}`);

  if (haveAllPassed(room)) {
    await endGameNoBids(io, room, roomId);
    return;
  }

  if (haveAllOthersPassed(room)) {
    finaliseBidding(io, room, roomId);
    return;
  }

  advanceBiddingTurn(room);
  emitBidUpdate(io, room, roomId);
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

function emitBidUpdate(io, room, roomId) {
  const currentPlayerId = getCurrentBidder(room);

  io.to(roomId).emit(EVENTS.BID_UPDATE, {
    currentBid: room.game.bidding.currentBid,
    highestBidder: room.game.bidding.highestBidder,
    currentPlayerId,
  });
}

function finaliseBidding(io, room, roomId) {
  endBidding(room);

  io.to(roomId).emit(EVENTS.BIDDING_ENDED, {
    highestBidder: room.game.bidding.highestBidder,
    bidAmount: room.game.bidding.currentBid,
  });

  console.log(`Bidding ended in room ${roomId}. Winner: ${room.game.bidding.highestBidder} at ${room.game.bidding.currentBid}`);
}

/**
 * Ends the game when every player passed without placing a bid.
 */
async function endGameNoBids(io, room, roomId) {
  room.game.phase = 'ended';

  const { matchId, coinDeltas } = await recordMatch({
    roomId,
    winnerTeam: 'none',
    bidTarget: 0,
    biddingTeam: [],
    opponentTeam: [],
  });

  io.to(roomId).emit(EVENTS.GAME_ENDED, {
    winnerTeam: 'none',
    scores: { teamA: 0, teamB: 0 },
    bidTarget: 0,
    maxPoints: 0,
    biddingTeam: [],
    opponentTeam: [],
    coinDeltas,
    matchId,
  });

  await deleteRoom(roomId);

  console.log(`Game ended in room ${roomId} — no one placed a bid.`);
}

// ---------------------------------------------------------------------------
// Guard helpers
// ---------------------------------------------------------------------------

function assertBiddingPhase(room) {
  if (!room)                          return 'Room not found';
  if (!room.game)                     return 'Game has not started';
  if (room.game.phase !== 'bidding')  return 'Game is not in the bidding phase';
  return null;
}

function assertPlayerTurn(room, socketId) {
  const currentBidderId = getCurrentBidder(room);
  if (currentBidderId !== socketId) return 'It is not your turn to bid';
  return null;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getPlayerById(room, socketId) {
  return room.players.find((player) => player.id === socketId) ?? null;
}

function validateBidPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';
  if (!payload.roomId || typeof payload.roomId !== 'string') return 'roomId is required';
  if (payload.amount === undefined || typeof payload.amount !== 'number') return 'amount is required and must be a number';
  return null;
}

function validatePassPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';
  if (!payload.roomId || typeof payload.roomId !== 'string') return 'roomId is required';
  return null;
}

module.exports = { registerBiddingHandlers };
