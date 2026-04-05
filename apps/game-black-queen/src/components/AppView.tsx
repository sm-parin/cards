"use client";

/**
 * AppView — top-level conditional renderer.
 *
 * View routing (state-based, no URL routing):
 *
 *   room === null                        → HomeScreen  (not yet in a room)
 *   room !== null && gameState === null  → LobbyScreen (waiting for game start)
 *   room !== null && gameState !== null  → GameScreen  (game in progress)
 *
 * Transitions are driven by Zustand store updates from socket events:
 *   ROOM_JOINED  → room is set       → Lobby
 *   GAME_STARTED → gameState is set  → Game
 */

import { useGameStore } from "@/store/gameStore";
import HomeScreen from "@/components/home/HomeScreen";
import LobbyScreen from "@/components/lobby/LobbyScreen";
import GameScreen from "@/components/game/GameScreen";

export default function AppView() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);

  if (!room) return <HomeScreen />;
  if (!gameState) return <LobbyScreen />;
  return <GameScreen />;
}
