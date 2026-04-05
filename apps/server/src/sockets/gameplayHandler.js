'use strict';

const { EVENTS } = require('../config/constants');
const { getRoom, deleteRoom } = require('../db/roomStore');
const { getCurrentPlayer, getNextTurn } = require('../utils/turnUtils');
const {
  validateCardPlay,
  removeCardFromHand,
  addToStack,
  checkPartnerReveal,
  resolveStackWinner,
  setStackWinnerTurn,
  finaliseStack,
} = require('../services/gameplayService');
const {
  calculateScores,
  determineWinner,
  getMaxPoints,
  isGameOver,
} = require('../services/scoringService');
const { recordMatch } = require('../services/matchRecorder');

/**
 * Registers gameplay socket event handlers for the PLAY_CARD flow.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerGameplayHandlers(socket, io) {
  socket.on(EVENTS.PLAY_CARD, (payload) =>
    handlePlayCard(socket, io, payload).catch((err) => {
      console.error('PLAY_CARD error:', err);
      socket.emit(EVENTS.ERROR, { message: 'Internal server error' });
    }),
  );
}

async function handlePlayCard(socket, io, { roomId, card } = {}) {
  if (!roomId || !card) {
    socket.emit(EVENTS.ERROR, { message: 'roomId and card are required.' });
    return;
  }

  const room = getRoom(roomId);
  if (!room) {
    socket.emit(EVENTS.ERROR, { message: 'Room not found.' });
    return;
  }

  const { game } = room;

  if (game.phase !== 'playing') {
    socket.emit(EVENTS.ERROR, { message: 'Game is not in playing phase.' });
    return;
  }

  const currentPlayer = getCurrentPlayer(room);
  if (!currentPlayer || currentPlayer.id !== socket.authUser.id) {
    socket.emit(EVENTS.ERROR, { message: 'It is not your turn.' });
    return;
  }

  try {
    validateCardPlay(room, currentPlayer, card);
  } catch (err) {
    socket.emit(EVENTS.ERROR, { message: err.message });
    return;
  }

  removeCardFromHand(currentPlayer, card);
  addToStack(room, socket.authUser.id, card);

  const wasRevealed = checkPartnerReveal(room, socket.authUser.id, card);
  if (wasRevealed) {
    io.to(roomId).emit(EVENTS.PARTNER_REVEALED, { playerId: socket.authUser.id });
  }

  io.to(roomId).emit(EVENTS.CARD_PLAYED, { playerId: socket.authUser.id, card });

  if (game.currentStack.length < room.players.length) {
    const next = getNextTurn(room);
    io.to(roomId).emit(EVENTS.TURN_UPDATE, { currentPlayerId: next.id });
  } else {
    const result = resolveStackWinner(game.currentStack, game.masterSuit, game.currentSuit);

    io.to(roomId).emit(EVENTS.STACK_RESULT, { winner: result.winner, cards: result.cards });

    finaliseStack(room, result);
    setStackWinnerTurn(room, result.winner);

    if (isGameOver(room)) {
      const bidTarget = game.bidding.currentBid;
      const maxPoints = getMaxPoints(game.deckCount);
      const { biddingScore, opponentScore, biddingTeam, opponentTeam } = calculateScores(room);
      const winnerTeam = determineWinner(biddingScore, bidTarget);

      game.phase = 'ended';
      game.score = { teamA: biddingScore, teamB: opponentScore };

      const { matchId, coinDeltas } = await recordMatch({
        roomId,
        winnerTeam,
        bidTarget,
        biddingTeam,
        opponentTeam,
      });

      io.to(roomId).emit(EVENTS.GAME_ENDED, {
        winnerTeam,
        scores: { teamA: biddingScore, teamB: opponentScore },
        bidTarget,
        maxPoints,
        biddingTeam,
        opponentTeam,
        coinDeltas,
        matchId,
      });

      await deleteRoom(roomId);
    } else {
      const winner = room.players.find((p) => p.id === result.winner);
      io.to(roomId).emit(EVENTS.TURN_UPDATE, {
        currentPlayerId: result.winner,
        currentPlayerName: winner ? winner.username : null,
      });
    }
  }
}

module.exports = { registerGameplayHandlers };
