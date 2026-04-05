/**
 * Typed socket emitter functions.
 *
 * All client→server socket emissions go through this module.
 * Components must NEVER call `socket.emit()` directly — use these wrappers.
 *
 * This centralises event names (via CLIENT_EVENTS constants) and enforces
 * correct payload types at compile time.
 *
 * @module utils/socketEmitter
 */

import socketInstance from "@/config/socket";
import { CLIENT_EVENTS } from "@/config/events";
import type {
  StartGamePayload,
  PlaceBidPayload,
  PassBidPayload,
  SelectMasterSuitPayload,
  SelectPartnerPayload,
  PlayCardPayload,
} from "@/types";

const TOKEN_KEY = "bq_token";

/** Returns the JWT stored in localStorage, or an empty string if unavailable. */
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

/** Persists a JWT to localStorage. */
export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

/** Removes the JWT from localStorage (logout). */
export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

/**
 * Emits INIT_PLAYER immediately on every socket connection.
 * The server uses the stable userId (from the JWT) to auto-rejoin the player
 * to any room they were in before the disconnect — no payload required.
 */
export const emitInitPlayer = (): void => {
  socketInstance.emit(CLIENT_EVENTS.INIT_PLAYER);
};

/**
 * Emits PLAY_NOW — requests matchmaking for a public game.
 * @param excludeRoomId - Optional room to skip (used by Match Again to avoid rejoining the same room)
 */
export const emitPlayNow = (excludeRoomId?: string): void => {
  socketInstance.emit(CLIENT_EVENTS.PLAY_NOW, { ...(excludeRoomId ? { excludeRoomId } : {}) });
};

/**
 * Emits CREATE_PRIVATE_ROOM — requests creation of a private room.
 * Expects PRIVATE_ROOM_CREATED in response.
 * @param maxPlayers - Maximum players for the room (5–10, default 5)
 */
export const emitCreatePrivateRoom = (maxPlayers = 5): void => {
  socketInstance.emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers });
};

/**
 * Emits JOIN_PRIVATE_ROOM — joins an existing private room with a 6-digit passkey.
 * @param passkey - The 6-digit code shared by the room creator
 */
export const emitJoinPrivateRoom = (passkey: string): void => {
  socketInstance.emit(CLIENT_EVENTS.JOIN_PRIVATE_ROOM, { passkey });
};

/**
 * Emits UPDATE_MAX_PLAYERS — lets the room creator adjust the player cap mid-lobby.
 * @param roomId    - The room to update
 * @param maxPlayers - New player limit (5–10, must be >= current player count)
 */
export const emitUpdateMaxPlayers = (roomId: string, maxPlayers: number): void => {
  socketInstance.emit(CLIENT_EVENTS.UPDATE_MAX_PLAYERS, { roomId, maxPlayers });
};

/**
 * Emits LEAVE_ROOM — exits the waiting lobby before the game starts.
 * @param roomId - The room to leave
 */
export const emitLeaveRoom = (roomId: string): void => {
  socketInstance.emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId });
};

/**
 * Emits GET_LOBBIES — requests the current public lobby list.
 * Server responds with LOBBIES_LIST.
 */
export const emitGetLobbies = (): void => {
  socketInstance.emit(CLIENT_EVENTS.GET_LOBBIES);
};

/**
 * Emits CREATE_PUBLIC_LOBBY — creates a public room with a configurable player cap.
 * @param maxPlayers - Maximum players in the room (5–10, default 5)
 */
export const emitCreatePublicLobby = (maxPlayers = 5): void => {
  socketInstance.emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers });
};

/**
 * Emits JOIN_PUBLIC_LOBBY — joins a specific public waiting room by room ID.
 * @param roomId - The ID of the room to join
 */
export const emitJoinPublicLobby = (roomId: string): void => {
  socketInstance.emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId });
};

/**
 * Emits START_GAME — initiates game start for the given room.
 * Requires >= 5 players; enforced server-side.
 * @param payload - Room ID
 */
export const emitStartGame = (payload: StartGamePayload): void => {
  socketInstance.emit(CLIENT_EVENTS.START_GAME, payload);
};

/**
 * Emits PLACE_BID — places a bid during the bidding phase.
 * @param payload - Room ID and bid amount
 */
export const emitPlaceBid = (payload: PlaceBidPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PLACE_BID, payload);
};

/**
 * Emits PASS_BID — passes the current bidding turn.
 * @param payload - Room ID
 */
export const emitPassBid = (payload: PassBidPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PASS_BID, payload);
};

/**
 * Emits SELECT_MASTER_SUIT — selects the trump suit (highest bidder only).
 * @param payload - Room ID and chosen suit
 */
export const emitSelectMasterSuit = (
  payload: SelectMasterSuitPayload
): void => {
  socketInstance.emit(CLIENT_EVENTS.SELECT_MASTER_SUIT, payload);
};

/**
 * Emits SELECT_PARTNER — selects partner-identifying cards (highest bidder only).
 * @param payload - Room ID and selected cards
 */
export const emitSelectPartner = (payload: SelectPartnerPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.SELECT_PARTNER, payload);
};

/**
 * Emits PLAY_CARD — plays a card to the current stack.
 * @param payload - Room ID and card string
 */
export const emitPlayCard = (payload: PlayCardPayload): void => {
  socketInstance.emit(CLIENT_EVENTS.PLAY_CARD, payload);
};
