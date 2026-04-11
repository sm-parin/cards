/**
 * Typed socket emitter functions for Jack Thief.
 *
 * Shared room/lobby emitters come from createRoomEmitters (@cards/game-sdk).
 * JT-specific game events are defined below.
 */

import socketInstance from "@/config/socket";
import { JT_CLIENT_EVENTS } from "@/config/events";
import { createRoomEmitters } from "@cards/game-sdk";
import type {
  JtStartGamePayload,
  JtDiscardPairPayload,
  JtSelectTargetPayload,
  JtPickCardPayload,
  JtReorderHandPayload,
} from "@/types";

const _r = createRoomEmitters(socketInstance, "jt_token", 4);

export const getToken              = _r.getToken;
export const setToken              = _r.setToken;
export const clearToken            = _r.clearToken;
export const emitInitPlayer        = _r.emitInitPlayer;
export const emitPlayNow           = _r.emitPlayNow;
export const emitCreatePrivateRoom = _r.emitCreatePrivateRoom;
export const emitJoinPrivateRoom   = _r.emitJoinPrivateRoom;
export const emitUpdateMaxPlayers  = _r.emitUpdateMaxPlayers;
export const emitLeaveRoom         = _r.emitLeaveRoom;
export const emitGetLobbies        = _r.emitGetLobbies;
export const emitCreatePublicLobby = _r.emitCreatePublicLobby;
export const emitJoinPublicLobby   = _r.emitJoinPublicLobby;

// ---------------------------------------------------------------------------
// Jack-Thief game events
// ---------------------------------------------------------------------------

export const emitJtStartGame = (payload: JtStartGamePayload): void => {
  socketInstance.emit(JT_CLIENT_EVENTS.JT_START_GAME, payload);
};

export const emitJtDiscardPair = (payload: JtDiscardPairPayload): void => {
  socketInstance.emit(JT_CLIENT_EVENTS.JT_DISCARD_PAIR, payload);
};

export const emitJtPickCard = (payload: JtPickCardPayload): void => {
  socketInstance.emit(JT_CLIENT_EVENTS.JT_PICK_CARD, payload);
};

export const emitJtSelectTarget = (payload: JtSelectTargetPayload): void => {
  socketInstance.emit(JT_CLIENT_EVENTS.JT_SELECT_TARGET, payload);
};

export const emitJtReorderHand = (payload: JtReorderHandPayload): void => {
  socketInstance.emit(JT_CLIENT_EVENTS.JT_REORDER_HAND, payload);
};
