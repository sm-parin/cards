/**
 * Global Zustand game store for Jack Thief.
 *
 * Single source of truth for all game state.
 * Components and hooks must NEVER manage socket or game state locally.
 *
 * @module store/gameStore
 */

import { create } from "zustand";
import type { Socket } from "socket.io-client";
import socketInstance from "@/config/socket";
import type {
  JtRoom,
  JtPlayer,
  JtGameState,
  Card,
} from "@/types";
import type { PlatformUser } from "@cards/types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface GameStoreState {
  socket: Socket | null;
  authUser: PlatformUser | null;
  room: JtRoom | null;
  player: JtPlayer | null;
  /** Full game state — set once JT_GAME_STARTED fires */
  gameState: JtGameState | null;
  /** This player's private hand (face-up to self only) */
  hand: Card[];
  /** Transient error/info notification */
  gameNotification: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface GameStoreActions {
  connectSocket: () => void;
  setAuthUser: (user: PlatformUser) => void;
  setRoom: (room: JtRoom) => void;
  updatePlayers: (players: JtPlayer[], maxPlayers?: number) => void;
  setPlayer: (player: JtPlayer) => void;

  /** Initialise game state from JT_GAME_STARTED or JT_GAME_STATE (rejoin) */
  setGameState: (state: JtGameState) => void;

  /** Update just the phase */
  setGamePhase: (phase: JtGameState["phase"]) => void;

  /** Replace public handSizes map */
  setHandSizes: (handSizes: Record<string, number>) => void;

  /** Update turn info after a pick or turn-pass */
  setTurnUpdate: (currentPickerId: string | null, targetPlayerId: string | null) => void;

  /** Set target selected + start buffer flag */
  setTargetSelected: (currentPickerId: string, targetPlayerId: string) => void;

  /** Pick window opened (buffer expired) */
  setPickWindowActive: (active: boolean) => void;

  /** Player-selection timer started/stopped */
  setSelectPlayerActive: (active: boolean) => void;

  /** Replace this player's private hand */
  setHand: (hand: Card[]) => void;

  /** Remove a pair of cards from the local hand (optimistic on JT_PAIR_DISCARDED for self) */
  removePairFromHand: (card1: Card, card2: Card) => void;

  /** Add a player to the winners list */
  addWinner: (playerId: string) => void;

  /** Set the loser and store coinDeltas on game end */
  setGameEnded: (loser: string | null, winners: string[], coinDeltas: Record<string, number>, matchId: string) => void;

  setGameNotification: (msg: string | null) => void;

  /** Reset all game state but keep socket connection */
  resetGame: () => void;
}

export type GameStore = GameStoreState & GameStoreActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_STATE: GameStoreState = {
  socket: null,
  authUser: null,
  room: null,
  player: null,
  gameState: null,
  hand: [],
  gameNotification: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  connectSocket: () => {
    if (socketInstance.connected) return;
    socketInstance.connect();
    set({ socket: socketInstance });
  },

  setAuthUser: (user) => set({ authUser: user }),

  setRoom: (room) => set({ room }),

  updatePlayers: (players, maxPlayers) => {
    const room = get().room;
    if (!room) return;
    set({
      room: { ...room, players, ...(maxPlayers !== undefined ? { maxPlayers } : {}) },
    });
  },

  setPlayer: (player) => set({ player }),

  setGameState: (state) => set({ gameState: state }),

  setGamePhase: (phase) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, phase } });
  },

  setHandSizes: (handSizes) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, handSizes } });
  },

  setTurnUpdate: (currentPickerId, targetPlayerId) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, currentPickerId, targetPlayerId, selectPlayerActive: false, bufferActive: false, pickWindowActive: false } });
  },

  setTargetSelected: (currentPickerId, targetPlayerId) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, currentPickerId, targetPlayerId, selectPlayerActive: false, bufferActive: true, pickWindowActive: false } });
  },

  setPickWindowActive: (active) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, bufferActive: false, pickWindowActive: active } });
  },

  setSelectPlayerActive: (active) => {
    const gs = get().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, selectPlayerActive: active } });
  },

  setHand: (hand) => set({ hand }),

  removePairFromHand: (card1, card2) => {
    const hand = get().hand;
    const idx1 = hand.indexOf(card1);
    const idx2 = hand.findIndex((c, i) => c === card2 && i !== idx1);
    if (idx1 === -1 || idx2 === -1) return;
    set({ hand: hand.filter((_, i) => i !== idx1 && i !== idx2) });
  },

  addWinner: (playerId) => {
    const gs = get().gameState;
    if (!gs) return;
    if (gs.winners.includes(playerId)) return;
    set({
      gameState: {
        ...gs,
        winners: [...gs.winners, playerId],
        activePlayers: gs.activePlayers.filter((id) => id !== playerId),
      },
    });
  },

  setGameEnded: (loser, winners, coinDeltas, matchId) => {
    const gs = get().gameState;
    set({
      gameState: gs
        ? { ...gs, phase: "ended", loser, winners, coinDeltas, matchId }
        : null,
    });
  },

  setGameNotification: (msg) => set({ gameNotification: msg }),

  resetGame: () =>
    set({
      room: null,
      player: null,
      gameState: null,
      hand: [],
      gameNotification: null,
    }),
}));
