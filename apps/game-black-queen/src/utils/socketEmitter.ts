/**
 * Typed socket emitter functions for Black Queen.
 *
 * Shared room/lobby emitters come from createRoomEmitters (@cards/game-sdk).
 * BQ-specific game events are defined below.
 */

import socketInstance from "@/config/socket";
import { CLIENT_EVENTS } from "@/config/events";
import { createRoomEmitters } from "@cards/game-sdk";
import type {
  StartGamePayload,
  PlaceBidPayload,
  PassBidPayload,
  SelectMasterSuitPayload,
  SelectPartnerPayload,
  PlayCardPayload,
} from "@/types";

const _r = createRoomEmitters(socketInstance, "bq_token", 5);

export const getToken             = _r.getToken;
export const setToken             = _r.setToken;
export const clearToken           = _r.clearToken;
export const emitInitPlayer       = _r.emitInitPlayer;
export const emitPlayNow          = _r.emitPlayNow;
export const emitCreatePrivateRoom = _r.emitCreatePrivateRoom;
export const emitJoinPrivateRoom  = _r.emitJoinPrivateRoom;
export const emitUpdateMaxPlayers = _r.emitUpdateMaxPlayers;
export const emitLeaveRoom        = _r.emitLeaveRoom;
export const emitGetLobbies       = _r.emitGetLobbies;
export const emitCreatePublicLobby = _r.emitCreatePublicLobby;
export const emitJoinPublicLobby  = _r.emitJoinPublicLobby;

// ---------------------------------------------------------------------------
// BQ game events
// ---------------------------------------------------------------------------

export const emitStartGame = (payload: StartGamePayload): void => {
  socketInstance.emit(CLIENT_EVENTS.START_GAME, payload);
};

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
