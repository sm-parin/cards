/**
 * Typed socket emitter functions for Jack Thief.
 *
 * Token helpers and INIT_PLAYER come from createRoomEmitters (@cards/game-sdk).
 * JT-specific game events are defined below.
 *
 * Lobby/room-joining emitters have been removed — the shell manages all lobby
 * operations. Games are entered exclusively via REJOIN_SUCCESS on connect.
 */

import socketInstance from "@/config/socket";
import { JT_CLIENT_EVENTS } from "@/config/events";
import { createRoomEmitters } from "@cards/game-sdk";
import type {
  JtDiscardPairPayload,
  JtSelectTargetPayload,
  JtPickCardPayload,
  JtReorderHandPayload,
} from "@/types";

const _r = createRoomEmitters(socketInstance, "jt_token", 4);

export const getToken       = _r.getToken;
export const setToken       = _r.setToken;
export const clearToken     = _r.clearToken;
export const emitInitPlayer = _r.emitInitPlayer;
export const emitLeaveRoom  = _r.emitLeaveRoom;

// ---------------------------------------------------------------------------
// Jack-Thief game events
// ---------------------------------------------------------------------------

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
