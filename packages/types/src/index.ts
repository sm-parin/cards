// Auth types live in @cards/auth, not here.
// Import AuthUser from @cards/auth in any file that needs it.

// Shared types and constants across the cards platform.

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * A playing card represented as a string: rank + suit symbol.
 * Examples: "A♠", "10♥", "Q♦", "J♣"
 * Both games use this format throughout.
 */
export type Card = string;

/**
 * Minimal shared Room interface. Both BQ Room and JT JtRoom satisfy this.
 * Use in shared packages (game-sdk, ui) where the concrete game type is unknown.
 */
export interface Room {
  roomId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: "waiting" | "playing";
  isPrivate: boolean;
  passkey?: string | null;
  creatorName: string;
  game?: unknown;
}

export type GameType = "black-queen" | "jack-thief";

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
// Jack-Thief game phase
// ---------------------------------------------------------------------------

export type JtGamePhase = "pre-game" | "playing" | "ended";

// ---------------------------------------------------------------------------
// Jack-Thief socket event name constants
// ---------------------------------------------------------------------------

/** Events emitted BY the client for Jack-Thief (frontend → backend) */
export const JT_CLIENT_EVENTS = {
  JT_START_GAME:   "JT_START_GAME",
  JT_DISCARD_PAIR: "JT_DISCARD_PAIR",
  JT_PICK_CARD:    "JT_PICK_CARD",
} as const;

/** Events emitted BY the server for Jack-Thief (backend → frontend) */
export const JT_SERVER_EVENTS = {
  JT_GAME_STARTED:    "JT_GAME_STARTED",
  JT_PLAYER_HAND:     "JT_PLAYER_HAND",
  JT_PRE_GAME_STARTED:"JT_PRE_GAME_STARTED",
  JT_PAIR_DISCARDED:  "JT_PAIR_DISCARDED",
  JT_PRE_GAME_ENDED:  "JT_PRE_GAME_ENDED",
  JT_CARD_PICKED:     "JT_CARD_PICKED",
  JT_HAND_UPDATE:     "JT_HAND_UPDATE",
  JT_PLAYER_WON:      "JT_PLAYER_WON",
  JT_GAME_ENDED:      "JT_GAME_ENDED",
  JT_GAME_STATE:      "JT_GAME_STATE",
  JT_ERROR:           "JT_ERROR",
} as const;

export type JtClientEvent = (typeof JT_CLIENT_EVENTS)[keyof typeof JT_CLIENT_EVENTS];
export type JtServerEvent = (typeof JT_SERVER_EVENTS)[keyof typeof JT_SERVER_EVENTS];

// ---------------------------------------------------------------------------
// Jack-Thief event payload types
// ---------------------------------------------------------------------------

export interface JtGameEndedPayload {
  loser: string | null;
  winners: string[];
  /** Coin delta per player ID: +100 win, -200 lose. */
  coinDeltas: Record<string, number>;
  matchId: string;
}

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
