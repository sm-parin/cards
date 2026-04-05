"use client";

import { useGameStore } from "@/store/gameStore";
import HomeScreen from "@/components/home/HomeScreen";
import LobbyScreen from "@/components/lobby/LobbyScreen";
import PreGameScreen from "@/components/game/PreGameScreen";
import PlayingScreen from "@/components/game/PlayingScreen";
import GameEndScreen from "@/components/game/GameEndScreen";

/**
 * AppView — top-level state-based router.
 *
 *   room === null                → HomeScreen
 *   room !== null, no game      → LobbyScreen
 *   game.phase === 'pre-game'   → PreGameScreen
 *   game.phase === 'playing'    → PlayingScreen
 *   game.phase === 'ended'      → GameEndScreen
 */
export default function AppView() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);

  if (!room) return <HomeScreen />;
  if (!gameState) return <LobbyScreen />;
  if (gameState.phase === "ended") return <GameEndScreen />;
  if (gameState.phase === "playing") return <PlayingScreen />;
  return <PreGameScreen />;
}
