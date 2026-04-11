/**
 * Frontend TypeScript types for the Black Queen game.
 *
 * Derived directly from the backend JSDoc typedefs in
 * `blackqueen-backend/src/rooms/roomStore.js`.
 *
 * Keep in sync with the backend — do NOT add fields that the server
 * does not send.
 */

// Re-export shared types from the platform package
export type { GamePhase, PlatformUser, RoomPlayer, GameEndedPayload } from "@cards/types";
import type { GamePhase, RoomPlayer } from "@cards/types";

// ---------------------------------------------------------------------------
// Card & Suit primitives
// ---------------------------------------------------------------------------

/** Unicode suit character used in card strings */
export type Suit = "♥" | "♣" | "♦" | "♠";

/**
 * A card represented as `value + suit`, e.g. `"Q♠"`, `"10♥"`, `"A♣"`.
 * Values: 2 3 4 5 6 7 8 9 10 J Q K A
 */
export type Card = string;

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * A player in a room, extended with the private hand of cards.
 * `id` is the stable auth UUID; `socketId` is the current socket connection.
 */
export interface Player extends RoomPlayer {
  hand: Card[];
}

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------

/** A single bid entry in the bidding history */
export interface BidEntry {
  playerId: string;
  amount: number;
}

export interface BiddingState {
  currentBid: number;
  highestBidder: string | null;
  currentTurnIndex: number;
  bids: BidEntry[];
}

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------

export interface PartnerState {
  selectedCards: Card[];
  partners: string[];
  revealed: boolean;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

/** A card play record — one entry per player per stack */
export interface StackCard {
  playerId: string;
  card: Card;
}

/** A completed stack entry stored in game history */
export interface StackRecord {
  winner: string;
  cards: StackCard[];
}

export interface GameScore {
  teamA: number;
  teamB: number;
}

export interface GameState {
  phase: GamePhase;
  currentTurnIndex: number;
  turnOrder: string[];
  deckCount: 1 | 2;
  bidding: BiddingState;
  masterSuit: Suit | null;
  partner: PartnerState;
  currentStack: StackCard[];
  currentSuit: Suit | null;
  history: StackRecord[];
  score: GameScore | null;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export type RoomStatus = "waiting" | "playing";

export interface Room {
  roomId: string;
  players: Player[];
  maxPlayers: number;
  status: RoomStatus;
  isPrivate: boolean;
  passkey: string | null;
  creatorName: string;
  game: GameState | null;
}

// ---------------------------------------------------------------------------
// Server → Client event payloads
// ---------------------------------------------------------------------------

export interface RoomJoinedPayload {
  room: Room;
}

export interface RejoinSuccessPayload {
  room: Room;
}

export interface RoomUpdatePayload {
  players: Player[];
  maxPlayers?: number;
}

export interface PrivateRoomCreatedPayload {
  roomId: string;
  passkey: string;
}

export interface GameStartedPayload {
  room: Room;
}

export interface TurnUpdatePayload {
  currentPlayerId: string | null;
  currentPlayerName?: string | null;
}

export interface PlayerHandPayload {
  cards: Card[];
}

export interface BidUpdatePayload {
  currentBid: number;
  highestBidder: string | null;
  currentPlayerId: string | null;
}

export interface BiddingEndedPayload {
  highestBidder: string | null;
  bidAmount: number;
}

export interface MasterSuitSelectedPayload {
  suit: Suit;
}

export interface PartnerSelectedPayload {
  selectedCards: Card[];
}

export interface CardPlayedPayload {
  playerId: string;
  card: Card;
}

export interface PartnerRevealedPayload {
  playerId: string;
}

export interface StackResultPayload {
  winner: string;
  cards: StackCard[];
}

export interface ErrorPayload {
  message: string;
}

// ---------------------------------------------------------------------------
// Lobby types
// ---------------------------------------------------------------------------

/** A single entry in the lobby list */
export interface LobbyEntry {
  roomId: string;
  creatorName: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export interface LobbiesListPayload {
  lobbies: LobbyEntry[];
}

// ---------------------------------------------------------------------------
// Client → Server event payloads
// ---------------------------------------------------------------------------

export interface JoinPrivateRoomPayload {
  passkey: string;
}

export interface StartGamePayload {
  roomId: string;
}

export interface PlaceBidPayload {
  roomId: string;
  amount: number;
}

export interface PassBidPayload {
  roomId: string;
}

export interface SelectMasterSuitPayload {
  roomId: string;
  suit: Suit;
}

export interface SelectPartnerPayload {
  roomId: string;
  cards: Card[];
}

export interface PlayCardPayload {
  roomId: string;
  card: Card;
}
