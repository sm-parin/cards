'use strict';

/**
 * Centralized socket event name constants.
 *
 * Using constants prevents typo-driven bugs and makes refactoring safe.
 * Both client and server should reference these values (or a shared copy).
 */
const EVENTS = {
  // Inbound (client → server)
  INIT_PLAYER: 'INIT_PLAYER',
  PLAY_NOW: 'PLAY_NOW',
  CREATE_PRIVATE_ROOM: 'CREATE_PRIVATE_ROOM',
  JOIN_PRIVATE_ROOM: 'JOIN_PRIVATE_ROOM',
  REJOIN_ROOM: 'REJOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  UPDATE_MAX_PLAYERS: 'UPDATE_MAX_PLAYERS',
  START_GAME: 'START_GAME',
  PLACE_BID: 'PLACE_BID',
  PASS_BID: 'PASS_BID',
  SELECT_MASTER_SUIT: 'SELECT_MASTER_SUIT',
  SELECT_PARTNER: 'SELECT_PARTNER',
  PLAY_CARD: 'PLAY_CARD',

  // Inbound — lobby browsing
  GET_LOBBIES: 'GET_LOBBIES',
  CREATE_PUBLIC_LOBBY: 'CREATE_PUBLIC_LOBBY',
  JOIN_PUBLIC_LOBBY: 'JOIN_PUBLIC_LOBBY',

  // Outbound (server → client)
  REJOIN_SUCCESS: 'REJOIN_SUCCESS',
  LOBBIES_LIST: 'LOBBIES_LIST',
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_UPDATE: 'ROOM_UPDATE',
  PRIVATE_ROOM_CREATED: 'PRIVATE_ROOM_CREATED',
  GAME_STARTED: 'GAME_STARTED',
  TURN_UPDATE: 'TURN_UPDATE',
  PLAYER_HAND: 'PLAYER_HAND',
  BID_UPDATE: 'BID_UPDATE',
  BIDDING_ENDED: 'BIDDING_ENDED',
  MASTER_SUIT_SELECTED: 'MASTER_SUIT_SELECTED',
  PARTNER_SELECTED: 'PARTNER_SELECTED',
  CARD_PLAYED: 'CARD_PLAYED',
  STACK_RESULT: 'STACK_RESULT',
  PARTNER_REVEALED: 'PARTNER_REVEALED',
  GAME_ENDED: 'GAME_ENDED',
  ERROR: 'ERROR',
};

/**
 * Game rule constants shared across services.
 */
const GAME_RULES = {
  /** Minimum number of players required before a game can start. */
  MIN_PLAYERS_TO_START: 5,

  /** Default maximum players per room. */
  DEFAULT_MAX_PLAYERS: 5,
};

/**
 * Configuration for private room passkeys.
 */
const PASSKEY = {
  /** Number of characters in a generated passkey. */
  LENGTH: 6,

  /** Numeric-only charset so the passkey looks and behaves like a 6-digit OTP. */
  CHARSET: '0123456789',
};

/**
 * Bidding rules per deck count.
 *
 * Keyed by deckCount (1 or 2).
 * minBid: lowest acceptable opening bid.
 * maxBid: highest possible bid; reaching it ends bidding immediately.
 * increment: all bids must be multiples of this value.
 */
const BID_RULES = {
  1: { minBid: 60, maxBid: 150, increment: 5 },
  2: { minBid: 120, maxBid: 300, increment: 5 },
};

/**
 * Valid suit symbols used in partner/master-suit selection.
 */
const SUITS = ['♥', '♣', '♦', '♠'];

/**
 * Socket event name constants for the Jack-Thief game.
 * All events are prefixed JT_ to prevent collision with Black Queen events.
 */
const JT_EVENTS = {
  // Inbound (client → server)
  JT_START_GAME:    'JT_START_GAME',
  JT_DISCARD_PAIR:  'JT_DISCARD_PAIR',
  JT_SELECT_TARGET: 'JT_SELECT_TARGET',  // active player selects who to pick from
  JT_PICK_CARD:     'JT_PICK_CARD',
  JT_REORDER_HAND:  'JT_REORDER_HAND',   // player reorders their own cards

  // Outbound (server → client)
  JT_GAME_STARTED:    'JT_GAME_STARTED',
  JT_PLAYER_HAND:     'JT_PLAYER_HAND',
  JT_PRE_GAME_STARTED:'JT_PRE_GAME_STARTED',
  JT_PAIR_DISCARDED:  'JT_PAIR_DISCARDED',
  JT_PRE_GAME_ENDED:  'JT_PRE_GAME_ENDED',
  JT_TARGET_SELECTED: 'JT_TARGET_SELECTED', // target locked in, buffer starts
  JT_SELECT_PLAYER_TIMER_START: 'JT_SELECT_PLAYER_TIMER_START', // 10s to choose a player
  JT_PICK_TIMER_START:'JT_PICK_TIMER_START', // buffer done, pick window opens
  JT_CARD_PICKED:     'JT_CARD_PICKED',
  JT_HAND_UPDATE:     'JT_HAND_UPDATE',
  JT_TURN_UPDATE:     'JT_TURN_UPDATE',      // whose turn it is after a pick
  JT_PLAYER_WON:      'JT_PLAYER_WON',
  JT_GAME_ENDED:      'JT_GAME_ENDED',
  JT_GAME_STATE:      'JT_GAME_STATE',
  JT_ERROR:           'JT_ERROR',
};

/**
 * Jack-Thief game rule constants.
 */
const JT_RULES = {
  /** Players using 1 deck */
  MAX_PLAYERS_ONE_DECK: 5,
  /** Min players */
  MIN_PLAYERS: 2,
  /** Max players supported */
  MAX_PLAYERS: 13,
  /** Pre-game pair-discard phase duration in milliseconds */
  PRE_GAME_DURATION_MS: 40_000,
  /** Time for active player to select a target (auto-selects random if expired) */
  SELECT_PLAYER_DURATION_MS: 10_000,
  /** Buffer after target is selected before pick window opens (ms) */
  SELECT_TARGET_BUFFER_MS: 5_000,
  /** Duration of the pick window (ms) — skips pick on expiry */
  PICK_CARD_DURATION_MS: 10_000,
  /** Coins awarded to winners */
  WIN_COINS: 100,
  /** Coins deducted from the loser */
  LOSE_COINS: -200,
  /** Max times one player can pick from the same player (when >3 active) */
  MAX_PICKS_FROM_SAME: 3,
};

module.exports = { EVENTS, GAME_RULES, PASSKEY, BID_RULES, SUITS, JT_EVENTS, JT_RULES };
