/**
 * Typed socket emitter functions for Jack Thief.
 *
 * All client→server socket emissions go through this module.
 * Components must NEVER call `socket.emit()` directly.
 */

import socketInstance from "@/config/socket";
import { JT_CLIENT_EVENTS, CLIENT_EVENTS } from "@/config/events";
import type {
  JtStartGamePayload,
  JtDiscardPairPayload,
  JtPickCardPayload,
} from "@/types";

const TOKEN_KEY = "jt_token";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Shared room events (reused from BQ infrastructure)
// ---------------------------------------------------------------------------

export const emitInitPlayer = (): void => {
  socketInstance.emit(CLIENT_EVENTS.INIT_PLAYER);
};

export const emitPlayNow = (excludeRoomId?: string): void => {
  socketInstance.emit(CLIENT_EVENTS.PLAY_NOW, {
    ...(excludeRoomId ? { excludeRoomId } : {}),
  });
};

export const emitCreatePrivateRoom = (maxPlayers = 4): void => {
  socketInstance.emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers });
};

export const emitJoinPrivateRoom = (passkey: string): void => {
  socketInstance.emit(CLIENT_EVENTS.JOIN_PRIVATE_ROOM, { passkey });
};

export const emitUpdateMaxPlayers = (roomId: string, maxPlayers: number): void => {
  socketInstance.emit(CLIENT_EVENTS.UPDATE_MAX_PLAYERS, { roomId, maxPlayers });
};

export const emitLeaveRoom = (roomId: string): void => {
  socketInstance.emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId });
};

export const emitGetLobbies = (): void => {
  socketInstance.emit(CLIENT_EVENTS.GET_LOBBIES);
};

export const emitCreatePublicLobby = (maxPlayers = 4): void => {
  socketInstance.emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers });
};

export const emitJoinPublicLobby = (roomId: string): void => {
  socketInstance.emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId });
};

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
