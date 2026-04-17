/**
 * Typed socket emitter functions for Black Queen.
 *
 * Token helpers and INIT_PLAYER come from createRoomEmitters (@cards/game-sdk).
 * BQ-specific game events are defined below.
 *
 * Lobby/room-joining emitters have been removed — the shell manages all lobby
 * operations. Games are entered exclusively via REJOIN_SUCCESS on connect.
 */

import socketInstance from "@/config/socket";
import { CLIENT_EVENTS } from "@/config/events";
import { createRoomEmitters } from "@cards/game-sdk";
import type {
  PlaceBidPayload,
  PassBidPayload,
  SelectMasterSuitPayload,
  SelectPartnerPayload,
  PlayCardPayload,
} from "@/types";

const _r = createRoomEmitters(socketInstance, "bq_token", 5);

export const getToken       = _r.getToken;
export const setToken       = _r.setToken;
export const clearToken     = _r.clearToken;
export const emitInitPlayer = _r.emitInitPlayer;
export const emitLeaveRoom  = _r.emitLeaveRoom;

// ---------------------------------------------------------------------------
// BQ game events
// ---------------------------------------------------------------------------

export const emitPlaceBid = (payload: PlaceBidPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PLACE_BID, payload);
};

export const emitPassBid = (payload: PassBidPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PASS_BID, payload);
};

export const emitSelectMasterSuit = (payload: SelectMasterSuitPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.SELECT_MASTER_SUIT, payload);
};

export const emitSelectPartner = (payload: SelectPartnerPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.SELECT_PARTNER, payload);
};

export const emitPlayCard = (payload: PlayCardPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PLAY_CARD, payload);
};
