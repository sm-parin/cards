// Shared types and constants across the cards platform.

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type GameType = "black-queen";

export type GamePhase =
  | "bidding"
  | "partner-selection"
  | "playing"
  | "ended";

export interface PlatformUser {
  id: string;
  username: string;
  coins: number;
}

/**
 * A player in a room — shared between server and frontend.
 * Does NOT include `hand` (private, emitted via PLAYER_HAND to each player individually).
 */
export interface RoomPlayer {
  id: string;
  socketId: string;
  username: string;
  isConnected: boolean;
  hasPassed: boolean;
  bid: number | null;
  team: string | null;
  /** Populated from server after joining a room. */
  coins?: number;
}

// ---------------------------------------------------------------------------
// Socket event name constants
// ---------------------------------------------------------------------------

/** Events emitted BY the client (frontend → backend) */
export const CLIENT_EVENTS = {
  INIT_PLAYER: "INIT_PLAYER",
  PLAY_NOW: "PLAY_NOW",
  CREATE_PRIVATE_ROOM: "CREATE_PRIVATE_ROOM",
  JOIN_PRIVATE_ROOM: "JOIN_PRIVATE_ROOM",
  LEAVE_ROOM: "LEAVE_ROOM",
  UPDATE_MAX_PLAYERS: "UPDATE_MAX_PLAYERS",
  GET_LOBBIES: "GET_LOBBIES",
  CREATE_PUBLIC_LOBBY: "CREATE_PUBLIC_LOBBY",
  JOIN_PUBLIC_LOBBY: "JOIN_PUBLIC_LOBBY",
  START_GAME: "START_GAME",
  PLACE_BID: "PLACE_BID",
  PASS_BID: "PASS_BID",
  SELECT_MASTER_SUIT: "SELECT_MASTER_SUIT",
  SELECT_PARTNER: "SELECT_PARTNER",
  PLAY_CARD: "PLAY_CARD",
} as const;

/** Events emitted BY the server (backend → frontend) */
export const SERVER_EVENTS = {
  REJOIN_SUCCESS: "REJOIN_SUCCESS",
  ROOM_JOINED: "ROOM_JOINED",
  ROOM_UPDATE: "ROOM_UPDATE",
  PRIVATE_ROOM_CREATED: "PRIVATE_ROOM_CREATED",
  LOBBIES_LIST: "LOBBIES_LIST",
  GAME_STARTED: "GAME_STARTED",
  TURN_UPDATE: "TURN_UPDATE",
  PLAYER_HAND: "PLAYER_HAND",
  BID_UPDATE: "BID_UPDATE",
  BIDDING_ENDED: "BIDDING_ENDED",
  MASTER_SUIT_SELECTED: "MASTER_SUIT_SELECTED",
  PARTNER_SELECTED: "PARTNER_SELECTED",
  CARD_PLAYED: "CARD_PLAYED",
  PARTNER_REVEALED: "PARTNER_REVEALED",
  STACK_RESULT: "STACK_RESULT",
  GAME_ENDED: "GAME_ENDED",
  ERROR: "ERROR",
} as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------

export interface GameEndedPayload {
  winnerTeam: "bidding" | "opponent" | "none";
  scores: { teamA: number; teamB: number };
  bidTarget: number;
  maxPoints: number;
  biddingTeam: string[];
  opponentTeam: string[];
  /** Coin delta per player ID: positive = won, negative = lost. */
  coinDeltas: Record<string, number>;
  /** UUID of the persisted match record. */
  matchId: string;
}
