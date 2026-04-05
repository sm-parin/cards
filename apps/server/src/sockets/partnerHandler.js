'use strict';

const { getRoom } = require('../db/roomStore');
const {
  validateSuit,
  validatePartnerCards,
  recordMasterSuit,
  recordPartnerSelection,
  assertHighestBidder,
  assertPhase,
} = require('../services/partnerService');
const { EVENTS } = require('../config/constants');

/**
 * Registers partner-selection phase socket event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
function registerPartnerHandlers(socket, io) {
  socket.on(EVENTS.SELECT_MASTER_SUIT, (payload) => handleSelectMasterSuit(socket, io, payload));
  socket.on(EVENTS.SELECT_PARTNER,     (payload) => handleSelectPartner(socket, io, payload));
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleSelectMasterSuit(socket, io, payload) {
  const payloadError = validateMasterSuitPayload(payload);
  if (payloadError) {
    socket.emit(EVENTS.ERROR, { message: payloadError });
    return;
  }

  const { roomId, suit } = payload;
  const room = getRoom(roomId);

  const phaseError = assertPhase(room, 'partner-selection');
  if (phaseError) {
    socket.emit(EVENTS.ERROR, { message: phaseError });
    return;
  }

  const bidderError = assertHighestBidder(room, socket.authUser.id);
  if (bidderError) {
    socket.emit(EVENTS.ERROR, { message: bidderError });
    return;
  }

  if (room.game.masterSuit !== null) {
    socket.emit(EVENTS.ERROR, { message: 'Master suit has already been selected' });
    return;
  }

  const suitError = validateSuit(suit);
  if (suitError) {
    socket.emit(EVENTS.ERROR, { message: suitError });
    return;
  }

  recordMasterSuit(room, suit);

  io.to(roomId).emit(EVENTS.MASTER_SUIT_SELECTED, { suit });

  console.log(`Master suit "${suit}" selected in room ${roomId} by ${socket.authUser.id}`);
}

function handleSelectPartner(socket, io, payload) {
  const payloadError = validateSelectPartnerPayload(payload);
  if (payloadError) {
    socket.emit(EVENTS.ERROR, { message: payloadError });
    return;
  }

  const { roomId, cards } = payload;
  const room = getRoom(roomId);

  const phaseError = assertPhase(room, 'partner-selection');
  if (phaseError) {
    socket.emit(EVENTS.ERROR, { message: phaseError });
    return;
  }

  const bidderError = assertHighestBidder(room, socket.authUser.id);
  if (bidderError) {
    socket.emit(EVENTS.ERROR, { message: bidderError });
    return;
  }

  if (room.game.masterSuit === null) {
    socket.emit(EVENTS.ERROR, { message: 'Master suit must be selected before choosing partner cards' });
    return;
  }

  if (room.game.partner.selectedCards.length > 0) {
    socket.emit(EVENTS.ERROR, { message: 'Partner cards have already been selected' });
    return;
  }

  const cardsError = validatePartnerCards(cards, room.game.deckCount);
  if (cardsError) {
    socket.emit(EVENTS.ERROR, { message: cardsError });
    return;
  }

  recordPartnerSelection(room, cards);

  const highestBidder = room.game.bidding.highestBidder;
  const bidderIdx = room.game.turnOrder.indexOf(highestBidder);
  if (bidderIdx !== -1) room.game.currentTurnIndex = bidderIdx;

  io.to(roomId).emit(EVENTS.PARTNER_SELECTED, { selectedCards: cards });
  io.to(roomId).emit(EVENTS.TURN_UPDATE, { currentPlayerId: highestBidder });

  console.log(`Partner cards selected in room ${roomId} by ${socket.authUser.id}. Cards: ${cards.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Payload validators
// ---------------------------------------------------------------------------

function validateMasterSuitPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';
  if (!payload.roomId || typeof payload.roomId !== 'string') return 'roomId is required';
  if (!payload.suit || typeof payload.suit !== 'string') return 'suit is required';
  return null;
}

function validateSelectPartnerPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';
  if (!payload.roomId || typeof payload.roomId !== 'string') return 'roomId is required';
  if (!Array.isArray(payload.cards)) return 'cards must be an array';
  return null;
}

module.exports = { registerPartnerHandlers };
