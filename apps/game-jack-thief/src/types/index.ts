/**
 * Frontend TypeScript types for Jack Thief.
 */

// Re-export shared types
export type { PlatformUser, RoomPlayer } from "@cards/types";
import type { RoomPlayer } from "@cards/types";

// ---------------------------------------------------------------------------
// Card & Suit
// ---------------------------------------------------------------------------

export type Suit = "♥" | "♣" | "♦" | "♠";
export type Card = string;

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface JtPlayer extends RoomPlayer {
  hand?: Card[]; // only populated locally for self
}

// ---------------------------------------------------------------------------
// Game state (client-side mirror of server JtGameState)
// ---------------------------------------------------------------------------

export type JtGamePhase = "pre-game" | "playing" | "ended";

export interface JtGameState {
  phase: JtGamePhase;
  deckCount: 1 | 2;
  /** Public hand sizes for all players */
  handSizes: Record<string, number>;
  winners: string[];
  loser: string | null;
  activePlayers: string[];
  pickCounts: Record<string, Record<string, number>>;
  /** Original pre-game duration in seconds */
  duration: number;
  /** Coin deltas — available after game ends */
  coinDeltas?: Record<string, number>;
  matchId?: string;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export type RoomStatus = "waiting" | "playing";

export interface JtRoom {
  roomId: string;
  players: JtPlayer[];
  maxPlayers: number;
  status: RoomStatus;
  isPrivate: boolean;
  passkey: string | null;
  creatorName: string;
  game: null; // JT manages game state separately — room.game is always null
}

// ---------------------------------------------------------------------------
// Server → Client event payloads
// ---------------------------------------------------------------------------

export interface JtGameStartedPayload {
  handSizes: Record<string, number>;
  deckCount: 1 | 2;
  duration: number;
}

export interface JtPlayerHandPayload {
  hand: Card[];
}

export interface JtPreGameEndedPayload {
  handSizes: Record<string, number>;
}

export interface JtPairDiscardedPayload {
  playerId: string;
  pair: [Card, Card];
  newHandSizes: Record<string, number>;
}

export interface JtCardPickedPayload {
  pickerId: string;
  fromPlayerId: string;
  card: Card;
  paired: boolean;
  discardedPair: [Card, Card] | null;
  newHandSizes: Record<string, number>;
}

export interface JtHandUpdatePayload {
  hand: Card[];
}

export interface JtPlayerWonPayload {
  playerId: string;
  winners: string[];
}

export interface JtGameEndedPayload {
  loser: string | null;
  winners: string[];
  coinDeltas: Record<string, number>;
  matchId: string;
}

export interface JtGameStatePayload {
  phase: JtGamePhase;
  deckCount: 1 | 2;
  handSizes: Record<string, number>;
  winners: string[];
  activePlayers: string[];
  pickCounts: Record<string, Record<string, number>>;
  duration: number;
}

export interface JtErrorPayload {
  message: string;
}

// ---------------------------------------------------------------------------
// Shared room payloads (reused from BQ room infrastructure)
// ---------------------------------------------------------------------------

export interface RoomJoinedPayload {
  room: JtRoom;
}

export interface RejoinSuccessPayload {
  room: JtRoom;
}

export interface RoomUpdatePayload {
  players: JtPlayer[];
  maxPlayers?: number;
}

export interface PrivateRoomCreatedPayload {
  roomId: string;
  passkey: string;
}

export interface LobbyEntry {
  roomId: string;
  creatorName: string;
  playerCount: number;
  maxPlayers: number;
}

export interface LobbiesListPayload {
  lobbies: LobbyEntry[];
}

// ---------------------------------------------------------------------------
// Client → Server event payloads
// ---------------------------------------------------------------------------

export interface JtStartGamePayload {
  roomId: string;
}

export interface JtDiscardPairPayload {
  roomId: string;
  cards: [Card, Card];
}

export interface JtPickCardPayload {
  roomId: string;
  fromPlayerId: string;
  cardIndex: number;
}
