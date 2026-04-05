"use client";

/**
 * useSocket — central socket event handler hook.
 *
 * Responsibilities:
 * 1. Opens the socket connection on first mount.
 * 2. Emits INIT_PLAYER on every connect so the server can auto-restore a
 *    previous session without the client needing to know its roomId.
 * 3. Registers all server-to-client event listeners.
 * 4. Dispatches updates to the Zustand game store.
 * 5. Cleans up listeners on unmount.
 *
 * Mount this hook ONCE at the application root (e.g. a layout component).
 * Never mount it inside game-specific components.
 *
 * @module hooks/useSocket
 */

import { useEffect } from "react";
import socketInstance from "@/config/socket";
import { SERVER_EVENTS } from "@/config/events";
import { useGameStore } from "@/store/gameStore";
import { emitInitPlayer } from "@/utils/socketEmitter";
import type {
  RoomJoinedPayload,
  RejoinSuccessPayload,
  RoomUpdatePayload,
  PrivateRoomCreatedPayload,
  LobbiesListPayload,
  GameStartedPayload,
  TurnUpdatePayload,
  PlayerHandPayload,
  BidUpdatePayload,
  BiddingEndedPayload,
  MasterSuitSelectedPayload,
  PartnerSelectedPayload,
  CardPlayedPayload,
  PartnerRevealedPayload,
  StackResultPayload,
  GameEndedPayload,
  ErrorPayload,
} from "@/types";

/** Duration (ms) to display the partner reveal banner before auto-clearing. */
const PARTNER_REVEAL_TTL = 4000;

/**
 * Initialises the socket connection and wires all server event handlers
 * to the Zustand store.
 *
 * Must be used in a Client Component.
 */
export function useSocket(): void {
  const {
    connectSocket,
    setRoom,
    updatePlayers,
    setPlayer,
    setCurrentTurn,
    updateBidding,
    addCardToStack,
    resolveStack,
    setGameEnded,
    setStackFlash,
    setPartnerRevealedId,
    setGamePhase,
    setMasterSuit,
    setSelectedPartnerCards,
    revealPartner,
    updateHand,
    removeFromHand,
    setGameNotification,
    setRoomPasskey,
    setLobbies,
  } = useGameStore();

  /** Resolves self from a room's player list using the stable auth user ID. */
  const findSelf = <T extends { id: string; coins?: number }>(players: T[]): T | undefined =>
    players.find((p) => p.id === useGameStore.getState().authUser?.id);

  /** Updates authUser.coins from a player object returned by the server. */
  const syncCoins = (self: { coins?: number } | undefined) => {
    if (self && typeof self.coins === "number") {
      const authUser = useGameStore.getState().authUser;
      if (authUser) {
        useGameStore.getState().setAuthUser({ ...authUser, coins: self.coins });
      }
    }
  };

  useEffect(() => {
    // ---- 0. On every connect/reconnect, fire INIT_PLAYER -------------------
    // The server checks the stable playerId against all active rooms and
    // emits REJOIN_SUCCESS if a match is found — no roomId needed from client.
    const onConnect = () => {
      emitInitPlayer();
    };
    socketInstance.on("connect", onConnect);

    // ---- 1. Open connection ------------------------------------------------
    connectSocket();

    // ---- 2. Register server → client event handlers -----------------------

    /**
     * REJOIN_SUCCESS
     * Emitted when INIT_PLAYER finds the player in an existing room.
     * Restores full room state; game state (if any) is derived from room.game.
     * A subsequent PLAYER_HAND and/or TURN_UPDATE arrives from the server.
     */
    const onRejoinSuccess = ({ room }: RejoinSuccessPayload) => {
      setRoom(room);
      const self = findSelf(room.players);
      if (self) {
        setPlayer(self);
        syncCoins(self);
      }
    };

    /**
     * ROOM_JOINED
     * Emitted to the joining socket only.
     * Sets the full room and resolves the local player by socket.id.
     */
    const onRoomJoined = ({ room }: RoomJoinedPayload) => {
      setRoom(room);
      const self = findSelf(room.players);
      if (self) {
        setPlayer(self);
        syncCoins(self);
      }
    };

    /**
     * ROOM_UPDATE
     * Emitted to all room members when the player list changes.
     * May also carry an updated maxPlayers when the creator changes the cap.
     * Both fields are applied atomically to avoid a stale-spread race.
     */
    const onRoomUpdate = ({ players, maxPlayers }: RoomUpdatePayload) => {
      updatePlayers(players, maxPlayers);
    };

    /**
     * PRIVATE_ROOM_CREATED
     * Emitted to the creator only — carries the passkey to share with friends.
     * ROOM_JOINED follows immediately with the full room object.
     */
    const onPrivateRoomCreated = ({ passkey }: PrivateRoomCreatedPayload) => {
      setRoomPasskey(passkey);
    };

    /**
     * LOBBIES_LIST
     * Response to GET_LOBBIES — delivers the current public lobby list.
     */
    const onLobbiesList = ({ lobbies }: LobbiesListPayload) => {
      setLobbies(lobbies);
    };

    /**
     * GAME_STARTED
     * Full room object with initialised game state.
     */
    const onGameStarted = ({ room }: GameStartedPayload) => {
      setRoom(room);
      const self = findSelf(room.players);
      if (self) {
        setPlayer(self);
        syncCoins(self);
      }
    };

    /**
     * TURN_UPDATE
     * Updates which player's turn it currently is.
     * Emitted after GAME_STARTED, after each card play, and after each stack.
     */
    const onTurnUpdate = (payload: TurnUpdatePayload) => {
      setCurrentTurn(payload);
    };

    /**
     * PLAYER_HAND
     * Private per-player event — delivers the player's own dealt cards.
     */
    const onPlayerHand = ({ cards }: PlayerHandPayload) => {
      updateHand(cards);
    };

    /**
     * BID_UPDATE
     * Updates bidding state after each bid or pass.
     */
    const onBidUpdate = ({
      currentBid,
      highestBidder,
      currentPlayerId,
    }: BidUpdatePayload) => {
      updateBidding({ currentBid, highestBidder });
      setCurrentTurn({ currentPlayerId });
    };

    /**
     * BIDDING_ENDED
     * Fires when the max bid is reached OR all others have passed.
     * Updates bid state and transitions UI phase to partner-selection.
     */
    const onBiddingEnded = ({
      highestBidder,
      bidAmount,
    }: BiddingEndedPayload) => {
      updateBidding({ currentBid: bidAmount, highestBidder });
      setGamePhase("partner-selection");
      setCurrentTurn({ currentPlayerId: null });
    };

    /**
     * MASTER_SUIT_SELECTED
     * The highest bidder has chosen the master (trump) suit.
     */
    const onMasterSuitSelected = ({ suit }: MasterSuitSelectedPayload) => {
      setMasterSuit(suit);
    };

    /**
     * PARTNER_SELECTED
     * The highest bidder has chosen partner-identifying cards.
     */
    const onPartnerSelected = ({ selectedCards }: PartnerSelectedPayload) => {
      setSelectedPartnerCards(selectedCards);
      setGamePhase("playing");
    };

    /**
     * CARD_PLAYED
     * A player has played a card to the current stack.
     * Also clears the stack flash from the previous completed round.
     */
    const onCardPlayed = ({ playerId, card }: CardPlayedPayload) => {
      addCardToStack({ playerId, card });
      setStackFlash(null);
      // Optimistically remove the played card from our own hand so
      // it disappears immediately without waiting for a PLAYER_HAND update
      if (playerId === socketInstance.id) {
        removeFromHand(card);
      }
    };

    /**
     * PARTNER_REVEALED
     * A partner identity has been exposed mid-play.
     * Sets a transient notification that auto-clears after PARTNER_REVEAL_TTL.
     */
    const onPartnerRevealed = ({ playerId }: PartnerRevealedPayload) => {
      revealPartner(playerId);
      setPartnerRevealedId(playerId);
      setTimeout(() => setPartnerRevealedId(null), PARTNER_REVEAL_TTL);
    };

    /**
     * STACK_RESULT
     * All cards have been played for this stack; winner determined.
     * Stores stack in history and sets a flash notification.
     */
    const onStackResult = ({ winner, cards }: StackResultPayload) => {
      resolveStack({ winner, cards });
      setStackFlash({ winner, cards });
    };

    /**
     * GAME_ENDED
     * All stacks complete; final scores and team results available.
     */
    const onGameEnded = (payload: GameEndedPayload) => {
      setGameEnded(payload);
    };

    /**
     * ERROR
     * Server-side validation or logic error directed at this socket.
     */
    const onError = ({ message }: ErrorPayload) => {
      setGameNotification(message);
      setTimeout(() => setGameNotification(null), 3000);
    };

    // ---- 3. Attach listeners -----------------------------------------------
    socketInstance.on(SERVER_EVENTS.REJOIN_SUCCESS, onRejoinSuccess);
    socketInstance.on(SERVER_EVENTS.ROOM_JOINED, onRoomJoined);
    socketInstance.on(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate);
    socketInstance.on(SERVER_EVENTS.PRIVATE_ROOM_CREATED, onPrivateRoomCreated);
    socketInstance.on(SERVER_EVENTS.LOBBIES_LIST, onLobbiesList);
    socketInstance.on(SERVER_EVENTS.GAME_STARTED, onGameStarted);
    socketInstance.on(SERVER_EVENTS.TURN_UPDATE, onTurnUpdate);
    socketInstance.on(SERVER_EVENTS.PLAYER_HAND, onPlayerHand);
    socketInstance.on(SERVER_EVENTS.BID_UPDATE, onBidUpdate);
    socketInstance.on(SERVER_EVENTS.BIDDING_ENDED, onBiddingEnded);
    socketInstance.on(SERVER_EVENTS.MASTER_SUIT_SELECTED, onMasterSuitSelected);
    socketInstance.on(SERVER_EVENTS.PARTNER_SELECTED, onPartnerSelected);
    socketInstance.on(SERVER_EVENTS.CARD_PLAYED, onCardPlayed);
    socketInstance.on(SERVER_EVENTS.PARTNER_REVEALED, onPartnerRevealed);
    socketInstance.on(SERVER_EVENTS.STACK_RESULT, onStackResult);
    socketInstance.on(SERVER_EVENTS.GAME_ENDED, onGameEnded);
    socketInstance.on(SERVER_EVENTS.ERROR, onError);

    // ---- 4. Cleanup on unmount ---------------------------------------------
    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off(SERVER_EVENTS.REJOIN_SUCCESS, onRejoinSuccess);
      socketInstance.off(SERVER_EVENTS.ROOM_JOINED, onRoomJoined);
      socketInstance.off(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate);
      socketInstance.off(SERVER_EVENTS.PRIVATE_ROOM_CREATED, onPrivateRoomCreated);
      socketInstance.off(SERVER_EVENTS.LOBBIES_LIST, onLobbiesList);
      socketInstance.off(SERVER_EVENTS.GAME_STARTED, onGameStarted);
      socketInstance.off(SERVER_EVENTS.TURN_UPDATE, onTurnUpdate);
      socketInstance.off(SERVER_EVENTS.PLAYER_HAND, onPlayerHand);
      socketInstance.off(SERVER_EVENTS.BID_UPDATE, onBidUpdate);
      socketInstance.off(SERVER_EVENTS.BIDDING_ENDED, onBiddingEnded);
      socketInstance.off(SERVER_EVENTS.MASTER_SUIT_SELECTED, onMasterSuitSelected);
      socketInstance.off(SERVER_EVENTS.PARTNER_SELECTED, onPartnerSelected);
      socketInstance.off(SERVER_EVENTS.CARD_PLAYED, onCardPlayed);
      socketInstance.off(SERVER_EVENTS.PARTNER_REVEALED, onPartnerRevealed);
      socketInstance.off(SERVER_EVENTS.STACK_RESULT, onStackResult);
      socketInstance.off(SERVER_EVENTS.GAME_ENDED, onGameEnded);
      socketInstance.off(SERVER_EVENTS.ERROR, onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
