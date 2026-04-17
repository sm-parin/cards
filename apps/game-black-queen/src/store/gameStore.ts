/**
 * Global Zustand game store.
 *
 * Single source of truth for:
 * - socket instance
 * - room state
 * - current player (self)
 * - game state
 * - transient UI notifications (stackFlash, partnerRevealedId)
 * - game end result
 *
 * Components and hooks must NEVER manage socket or game state locally.
 * All updates flow through these actions.
 *
 * @module store/gameStore
 */

import { create } from "zustand";
import type { Socket } from "socket.io-client";
import socketInstance from "@/config/socket";
import type {
  Room,
  Player,
  GameState,
  BiddingState,
  StackCard,
  StackRecord,
  GameScore,
  Suit,
  Card,
  GameEndedPayload,

} from "@/types";
import type { PlatformUser } from "@cards/types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface GameStoreState {
  /** The singleton socket — null until connectSocket() is called */
  socket: Socket | null;

  /** Authenticated user — set from JWT on load, updated from server events */
  authUser: PlatformUser | null;

  /** The current room the player is in — null until ROOM_JOINED */
  room: Room | null;

  /** The local player (self) — derived from room.players on ROOM_JOINED */
  player: Player | null;

  /** Shorthand reference to room.game — kept in sync on every game event */
  gameState: GameState | null;

  /** Socket ID of the player whose turn it currently is */
  currentPlayerId: string | null;

  /**
   * Full GAME_ENDED payload — available when phase === "ended".
   * Contains winnerTeam, bidTarget, biddingTeam, opponentTeam.
   */
  gameEndResult: GameEndedPayload | null;

  /**
   * Transient stack result — set after STACK_RESULT, cleared on next CARD_PLAYED.
   * Used by StackFlash to display a brief winner notice.
   */
  stackFlash: StackRecord | null;

  /**
   * Transient partner reveal — set after PARTNER_REVEALED, auto-cleared after timeout.
   * Holds the revealed player's socket ID.
   */
  partnerRevealedId: string | null;

  /**
   * Transient in-game notification (e.g. "You must follow suit").
   * Set by socket errors during gameplay; auto-cleared after a few seconds.
   */
  gameNotification: string | null;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

interface GameStoreActions {
  /**
   * Opens the socket connection and stores the socket instance.
   * Idempotent — safe to call multiple times.
   */
  connectSocket: () => void;

  /** Updates the authenticated user (called after login and from server events) */
  setAuthUser: (user: PlatformUser) => void;

  /**
   * Stores the full room object and derives `gameState` from it.
   * @param room - Full Room payload from ROOM_JOINED or GAME_STARTED
   */
  setRoom: (room: Room) => void;

  /**
   * Replaces the player list inside the current room.
   * Optionally also updates maxPlayers atomically — use this when ROOM_UPDATE
   * carries both fields to avoid a two-step set() race.
   * @param players   - Updated player array
   * @param maxPlayers - Optional new player cap
   */
  updatePlayers: (players: Player[], maxPlayers?: number) => void;

  /**
   * Replaces the full game state.
   * Used when the complete GameState object is available.
   * @param game - Full GameState object
   */
  setGameState: (game: GameState) => void;

  /**
   * Stores the local player (self).
   * @param player - The Player object matching socket.id
   */
  setPlayer: (player: Player) => void;

  /**
   * Stores the full GAME_ENDED payload and transitions phase to "ended".
   * @param payload - Full GameEndedPayload from the server
   */
  setGameEnded: (payload: GameEndedPayload) => void;

  /**
   * Sets the transient stack result flash notification.
   * @param record - Completed stack record, or null to clear.
   */
  setStackFlash: (record: StackRecord | null) => void;

  /**
   * Sets the transient partner reveal notification.
   * @param id - Revealed player's socket ID, or null to clear.
   */
  setPartnerRevealedId: (id: string | null) => void;

  /**
   * Sets or clears the in-game notification message.
   * @param msg - Notification text, or null to clear.
   */
  setGameNotification: (msg: string | null) => void;

  /** Stores the passkey for the private room this player created */
  setRoomPasskey: (passkey: string | null) => void;

  /** Updates the public lobby list from a LOBBIES_LIST event */
  setLobbies: (lobbies: LobbyEntry[]) => void;

  /** Updates room.maxPlayers — used when the creator changes the cap mid-lobby */
  setMaxPlayers: (maxPlayers: number) => void;

  /**
   * Resets all game state back to initial values.
   * Used for "Play Again" — preserves socket connection.
   */
  resetGame: () => void;

  // ---- Internal helpers used by useSocket hook ----------------------------

  /** Updates the current turn pointer */
  setCurrentTurn: (payload: {
    currentPlayerId: string | null;
    currentPlayerName?: string | null;
  }) => void;

  /** Merges a partial update into the bidding sub-state */
  updateBidding: (partial: Partial<BiddingState>) => void;

  /** Appends a card play to the current stack */
  addCardToStack: (entry: StackCard) => void;

  /** Clears the current stack and appends the result to history */
  resolveStack: (record: StackRecord) => void;

  /** Updates the master suit in game state */
  setMasterSuit: (suit: Suit) => void;

  /** Transitions the game phase — used when the server changes phase without sending a full room object */
  setGamePhase: (phase: GameState["phase"]) => void;

  /** Updates the selected partner cards */
  setSelectedPartnerCards: (cards: Card[]) => void;

  /** Marks a player as a revealed partner */
  revealPartner: (playerId: string) => void;

  /** Replaces the current player's hand */
  updateHand: (cards: Card[]) => void;

  /** Removes a single card from the current player's hand (optimistic on card play) */
  removeFromHand: (card: Card) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type GameStore = GameStoreState & GameStoreActions;

const INITIAL_STATE: GameStoreState = {
  socket: null,
  authUser: null,
  room: null,
  player: null,
  gameState: null,
  currentPlayerId: null,
  gameEndResult: null,
  stackFlash: null,
  partnerRevealedId: null,
  gameNotification: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  // ---- Initial state -------------------------------------------------------
  ...INITIAL_STATE,

  // ---- Required actions ---------------------------------------------------

  connectSocket: () => {
    if (socketInstance.connected) return;
    socketInstance.connect();
    set({ socket: socketInstance });
  },

  setAuthUser: (user) => {
    set({ authUser: user });
  },

  setRoom: (room) => {
    set({
      room,
      gameState: room.game ?? null,
    });
  },

  updatePlayers: (players, maxPlayers) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, players, ...(maxPlayers !== undefined ? { maxPlayers } : {}) } });
  },

  setGameState: (game) => {
    const room = get().room;
    set({
      gameState: game,
      room: room ? { ...room, game } : room,
    });
  },

  setPlayer: (player) => {
    set({ player });
  },

  setGameEnded: (payload) => {
    const gameState = get().gameState;
    if (!gameState) return;
    get().setGameState({ ...gameState, phase: "ended", score: payload.scores });
    set({ gameEndResult: payload });
  },

  setStackFlash: (record) => {
    set({ stackFlash: record });
  },

  setPartnerRevealedId: (id) => {
    set({ partnerRevealedId: id });
  },

  setGameNotification: (msg) => {
    set({ gameNotification: msg });
  },

  resetGame: () => {
    set({
      room: null,
      player: null,
      gameState: null,
      currentPlayerId: null,
      gameEndResult: null,
      stackFlash: null,
      partnerRevealedId: null,
      gameNotification: null,
    });
  },

  // ---- Internal helpers ---------------------------------------------------

  setCurrentTurn: ({ currentPlayerId }) => {
    set({ currentPlayerId });
  },

  updateBidding: (partial) => {
    const gameState = get().gameState;
    if (!gameState) return;
    const updatedGame: GameState = {
      ...gameState,
      bidding: { ...gameState.bidding, ...partial },
    };
    get().setGameState(updatedGame);
  },

  addCardToStack: (entry) => {
    const gameState = get().gameState;
    if (!gameState) return;
    const isFirstCard = gameState.currentStack.length === 0;
    const updatedGame: GameState = {
      ...gameState,
      currentStack: [...gameState.currentStack, entry],
      ...(isFirstCard ? { currentSuit: entry.card.slice(-1) as Suit } : {}),
    };
    get().setGameState(updatedGame);
  },

  resolveStack: (record) => {
    const gameState = get().gameState;
    if (!gameState) return;
    const updatedGame: GameState = {
      ...gameState,
      currentStack: [],
      currentSuit: null,
      history: [...gameState.history, record],
    };
    get().setGameState(updatedGame);
  },

  setMasterSuit: (suit) => {
    const gameState = get().gameState;
    if (!gameState) return;
    get().setGameState({ ...gameState, masterSuit: suit });
  },

  setGamePhase: (phase) => {
    const gameState = get().gameState;
    if (!gameState) return;
    get().setGameState({ ...gameState, phase });
  },

  setSelectedPartnerCards: (cards) => {
    const gameState = get().gameState;
    if (!gameState) return;
    const updatedGame: GameState = {
      ...gameState,
      partner: { ...gameState.partner, selectedCards: cards },
    };
    get().setGameState(updatedGame);
  },

  revealPartner: (playerId) => {
    const gameState = get().gameState;
    if (!gameState) return;
    const updatedGame: GameState = {
      ...gameState,
      partner: {
        ...gameState.partner,
        partners: [...gameState.partner.partners, playerId],
        revealed: true,
      },
    };
    get().setGameState(updatedGame);
  },

  updateHand: (cards) => {
    const player = get().player;
    if (!player) return;
    const updated: Player = { ...player, hand: cards };
    set({ player: updated });

    // Also sync into room.players so the list stays consistent
    const room = get().room;
    if (!room) return;
    const players = room.players.map((p) =>
      p.id === player.id ? updated : p
    );
    set({ room: { ...room, players } });
  },

  removeFromHand: (card) => {
    const player = get().player;
    if (!player) return;
    const idx = player.hand.indexOf(card);
    if (idx === -1) return;
    const newHand = [...player.hand];
    newHand.splice(idx, 1);
    get().updateHand(newHand);
  },
}));
