"use client";

/**
 * useSocket — central socket event handler hook for Jack Thief.
 *
 * Responsibilities:
 * 1. Opens the socket connection on first mount.
 * 2. Emits INIT_PLAYER on every connect for auto-rejoin.
 * 3. Registers all server event listeners.
 * 4. Dispatches updates to the Zustand game store.
 * 5. Cleans up listeners on unmount.
 *
 * Mount this hook ONCE at the application root via SocketInitializer.
 */

import { useEffect } from "react";
import socketInstance from "@/config/socket";
import { JT_SERVER_EVENTS, SERVER_EVENTS } from "@/config/events";
import { useGameStore } from "@/store/gameStore";
import { emitInitPlayer } from "@/utils/socketEmitter";
import type {
  RoomJoinedPayload,
  RejoinSuccessPayload,
  RoomUpdatePayload,
  PrivateRoomCreatedPayload,
  LobbiesListPayload,
  JtGameStartedPayload,
  JtPlayerHandPayload,
  JtPreGameEndedPayload,
  JtPairDiscardedPayload,
  JtCardPickedPayload,
  JtHandUpdatePayload,
  JtPlayerWonPayload,
  JtGameEndedPayload,
  JtGameStatePayload,
  JtTargetSelectedPayload,
  JtPickTimerStartPayload,
  JtSelectPlayerTimerStartPayload,
  JtTurnUpdatePayload,
  JtErrorPayload,
  JtPlayer,
} from "@/types";

const NOTIFICATION_TTL = 3000;

export function useSocket(): void {
  const {
    connectSocket,
    setRoom,
    updatePlayers,
    setPlayer,
    setGameState,
    setGamePhase,
    setHandSizes,
    setTurnUpdate,
    setTargetSelected,
    setPickWindowActive,
    setSelectPlayerActive,
    setHand,
    removePairFromHand,
    addWinner,
    setGameEnded,
    setGameNotification,
    setRoomPasskey,
    setLobbies,
  } = useGameStore();

  /** Finds self in a player list by stable auth user ID */
  const findSelf = (players: JtPlayer[]) =>
    players.find((p) => p.id === useGameStore.getState().authUser?.id);

  /** Updates authUser.coins from a server player object */
  const syncCoins = (self: { coins?: number } | undefined) => {
    if (self && typeof self.coins === "number") {
      const authUser = useGameStore.getState().authUser;
      if (authUser) {
        useGameStore.getState().setAuthUser({ ...authUser, coins: self.coins });
      }
    }
  };

  useEffect(() => {
    // ── On every connect/reconnect, fire INIT_PLAYER ──────────────────────
    const onConnect = () => {
      const authUser = useGameStore.getState().authUser;
      if (authUser && authUser.id === '') {
        useGameStore.getState().setAuthUser({ ...authUser, id: socketInstance.id ?? '' });
      }
      emitInitPlayer();
    };
    socketInstance.on("connect", onConnect);

    connectSocket();

    // ── Room infrastructure events (shared with BQ) ───────────────────────

    const onRejoinSuccess = ({ room }: RejoinSuccessPayload) => {
      setRoom(room);
      const self = findSelf(room.players);
      if (self) { setPlayer(self); syncCoins(self); }
    };

    const onRoomJoined = ({ room }: RoomJoinedPayload) => {
      setRoom(room);
      const self = findSelf(room.players);
      if (self) { setPlayer(self); syncCoins(self); }
    };

    const onRoomUpdate = ({ players, maxPlayers }: RoomUpdatePayload) => {
      updatePlayers(players, maxPlayers);
    };

    const onPrivateRoomCreated = ({ passkey }: PrivateRoomCreatedPayload) => {
      setRoomPasskey(passkey);
    };

    const onLobbiesList = ({ lobbies }: LobbiesListPayload) => {
      setLobbies(lobbies);
    };

    // ── Jack-Thief game events ─────────────────────────────────────────────

    /**
     * JT_GAME_STARTED — game has begun; initialise game state.
     */
    const onJtGameStarted = ({ handSizes, deckCount, duration, currentPickerId }: JtGameStartedPayload) => {
      setGameState({
        phase: "pre-game",
        deckCount,
        handSizes,
        winners: [],
        loser: null,
        activePlayers: Object.keys(handSizes),
        pickCounts: {},
        duration,
        currentPickerId,
        targetPlayerId: null,
        selectPlayerActive: false,
        bufferActive: false,
        pickWindowActive: false,
      });
    };

    /**
     * JT_PLAYER_HAND — private hand dealt to this player.
     */
    const onJtPlayerHand = ({ hand }: JtPlayerHandPayload) => {
      setHand(hand);
    };

    /**
     * JT_PAIR_DISCARDED — a player discarded a pair (may be self or other).
     */
    const onJtPairDiscarded = ({ playerId, pair, newHandSizes }: JtPairDiscardedPayload) => {
      setHandSizes(newHandSizes);
      // If it's our own discard, remove from local hand
      const selfId = useGameStore.getState().authUser?.id;
      if (playerId === selfId) {
        removePairFromHand(pair[0], pair[1]);
      }
    };

    /**
     * JT_PRE_GAME_ENDED — 40-second timer fired; playing phase begins.
     */
    const onJtPreGameEnded = ({ handSizes, currentPickerId }: JtPreGameEndedPayload) => {
      setHandSizes(handSizes);
      setGamePhase("playing");
      setTurnUpdate(currentPickerId ?? null, null);
    };

    /**
     * JT_CARD_PICKED — a player picked a card from another player.
     * Updates public hand sizes for everyone.
     */
    const onJtCardPicked = ({ newHandSizes }: JtCardPickedPayload) => {
      setHandSizes(newHandSizes);
    };

    /**
     * JT_HAND_UPDATE — private hand update sent only to the picker after a pick.
     */
    const onJtHandUpdate = ({ hand }: JtHandUpdatePayload) => {
      setHand(hand);
    };

    /**
     * JT_PLAYER_WON — a player emptied their hand.
     */
    const onJtPlayerWon = ({ playerId }: JtPlayerWonPayload) => {
      addWinner(playerId);
    };

    /**
     * JT_GAME_ENDED — last player is left holding the Jack.
     */
    const onJtGameEnded = ({ loser, winners, coinDeltas, matchId }: JtGameEndedPayload) => {
      setGameEnded(loser, winners, coinDeltas, matchId);
      const authUser = useGameStore.getState().authUser;
      if (authUser && typeof coinDeltas[authUser.id] === 'number') {
        useGameStore.getState().setAuthUser({ ...authUser, coins: authUser.coins + coinDeltas[authUser.id] });
      }
    };

    /**
     * JT_GAME_STATE — full state sent on reconnect via INIT_PLAYER.
     */
    const onJtGameState = (payload: JtGameStatePayload) => {
      setGameState({
        phase: payload.phase,
        deckCount: payload.deckCount,
        handSizes: payload.handSizes,
        winners: payload.winners,
        loser: null,
        activePlayers: payload.activePlayers,
        pickCounts: payload.pickCounts,
        duration: payload.duration,
        currentPickerId: payload.currentPickerId,
        targetPlayerId: payload.targetPlayerId,
        selectPlayerActive: payload.selectPlayerActive,
        bufferActive: payload.bufferActive,
        pickWindowActive: payload.pickWindowActive,
      });
    };

    /**
     * JT_TARGET_SELECTED — active picker locked in a target; 5-sec buffer starts.
     */
    const onJtTargetSelected = ({ currentPickerId, targetPlayerId }: JtTargetSelectedPayload) => {
      setTargetSelected(currentPickerId, targetPlayerId);
    };

    /**
     * JT_SELECT_PLAYER_TIMER_START — picker has 10s to choose a target player.
     */
    const onJtSelectPlayerTimerStart = (_payload: JtSelectPlayerTimerStartPayload) => {
      setSelectPlayerActive(true);
    };

    /**
     * JT_PICK_TIMER_START — buffer expired; 20-sec pick window is open.
     */
    const onJtPickTimerStart = (_payload: JtPickTimerStartPayload) => {
      setPickWindowActive(true);
    };

    /**
     * JT_TURN_UPDATE — after a pick or timer expiry, new active picker announced.
     */
    const onJtTurnUpdate = ({ currentPickerId, targetPlayerId }: JtTurnUpdatePayload) => {
      setTurnUpdate(currentPickerId, targetPlayerId);
    };

    /**
     * JT_ERROR — server-side validation error directed at this socket.
     */
    const onJtError = ({ message }: JtErrorPayload) => {
      setGameNotification(message);
      setTimeout(() => setGameNotification(null), NOTIFICATION_TTL);
    };

    // ── Attach all listeners ──────────────────────────────────────────────
    socketInstance.on(SERVER_EVENTS.REJOIN_SUCCESS, onRejoinSuccess);
    socketInstance.on(SERVER_EVENTS.ROOM_JOINED, onRoomJoined);
    socketInstance.on(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate);
    socketInstance.on(SERVER_EVENTS.PRIVATE_ROOM_CREATED, onPrivateRoomCreated);
    socketInstance.on(SERVER_EVENTS.LOBBIES_LIST, onLobbiesList);
    socketInstance.on(JT_SERVER_EVENTS.JT_GAME_STARTED, onJtGameStarted);
    socketInstance.on(JT_SERVER_EVENTS.JT_PLAYER_HAND, onJtPlayerHand);
    socketInstance.on(JT_SERVER_EVENTS.JT_PAIR_DISCARDED, onJtPairDiscarded);
    socketInstance.on(JT_SERVER_EVENTS.JT_PRE_GAME_ENDED, onJtPreGameEnded);
    socketInstance.on(JT_SERVER_EVENTS.JT_TARGET_SELECTED, onJtTargetSelected);
    socketInstance.on(JT_SERVER_EVENTS.JT_SELECT_PLAYER_TIMER_START, onJtSelectPlayerTimerStart);
    socketInstance.on(JT_SERVER_EVENTS.JT_PICK_TIMER_START, onJtPickTimerStart);
    socketInstance.on(JT_SERVER_EVENTS.JT_CARD_PICKED, onJtCardPicked);
    socketInstance.on(JT_SERVER_EVENTS.JT_HAND_UPDATE, onJtHandUpdate);
    socketInstance.on(JT_SERVER_EVENTS.JT_TURN_UPDATE, onJtTurnUpdate);
    socketInstance.on(JT_SERVER_EVENTS.JT_PLAYER_WON, onJtPlayerWon);
    socketInstance.on(JT_SERVER_EVENTS.JT_GAME_ENDED, onJtGameEnded);
    socketInstance.on(JT_SERVER_EVENTS.JT_GAME_STATE, onJtGameState);
    socketInstance.on(JT_SERVER_EVENTS.JT_ERROR, onJtError);

    // ── Cleanup on unmount ────────────────────────────────────────────────
    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off(SERVER_EVENTS.REJOIN_SUCCESS, onRejoinSuccess);
      socketInstance.off(SERVER_EVENTS.ROOM_JOINED, onRoomJoined);
      socketInstance.off(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate);
      socketInstance.off(SERVER_EVENTS.PRIVATE_ROOM_CREATED, onPrivateRoomCreated);
      socketInstance.off(SERVER_EVENTS.LOBBIES_LIST, onLobbiesList);
      socketInstance.off(JT_SERVER_EVENTS.JT_GAME_STARTED, onJtGameStarted);
      socketInstance.off(JT_SERVER_EVENTS.JT_PLAYER_HAND, onJtPlayerHand);
      socketInstance.off(JT_SERVER_EVENTS.JT_PAIR_DISCARDED, onJtPairDiscarded);
      socketInstance.off(JT_SERVER_EVENTS.JT_PRE_GAME_ENDED, onJtPreGameEnded);
      socketInstance.off(JT_SERVER_EVENTS.JT_TARGET_SELECTED, onJtTargetSelected);
      socketInstance.off(JT_SERVER_EVENTS.JT_SELECT_PLAYER_TIMER_START, onJtSelectPlayerTimerStart);
      socketInstance.off(JT_SERVER_EVENTS.JT_PICK_TIMER_START, onJtPickTimerStart);
      socketInstance.off(JT_SERVER_EVENTS.JT_CARD_PICKED, onJtCardPicked);
      socketInstance.off(JT_SERVER_EVENTS.JT_HAND_UPDATE, onJtHandUpdate);
      socketInstance.off(JT_SERVER_EVENTS.JT_TURN_UPDATE, onJtTurnUpdate);
      socketInstance.off(JT_SERVER_EVENTS.JT_PLAYER_WON, onJtPlayerWon);
      socketInstance.off(JT_SERVER_EVENTS.JT_GAME_ENDED, onJtGameEnded);
      socketInstance.off(JT_SERVER_EVENTS.JT_GAME_STATE, onJtGameState);
      socketInstance.off(JT_SERVER_EVENTS.JT_ERROR, onJtError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
