"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import PreGameScreen from "@/components/game/PreGameScreen";
import PlayingScreen from "@/components/game/PlayingScreen";
import GameEndScreen from "@/components/game/GameEndScreen";

/**
 * AppView — top-level state-based router.
 *
 * Game entry is always via shell lobby. The game app never shows a lobby.
 * On load: socket connects → INIT_PLAYER → server sends REJOIN_SUCCESS +
 * JT_GAME_STATE → game renders.
 *
 *   gameState.phase === 'pre-game' → PreGameScreen
 *   gameState.phase === 'playing'  → PlayingScreen
 *   gameState.phase === 'ended'    → GameEndScreen
 *   timed out (no state)           → Error with link back to shell
 *   otherwise                      → Loading
 */

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL || "http://localhost:3000";
const REJOIN_TIMEOUT_MS = 8000;

export default function AppView() {
  const gameState = useGameStore((s) => s.gameState);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (gameState) return;
    const t = setTimeout(() => setTimedOut(true), REJOIN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [gameState]);

  if (gameState) {
    if (gameState.phase === "ended") return <GameEndScreen />;
    if (gameState.phase === "playing") return <PlayingScreen />;
    return <PreGameScreen />;
  }

  if (timedOut) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", color: "#9ca3af" }}>
        <p style={{ margin: 0 }}>No active game session found.</p>
        <a href={`${SHELL_URL}/explore`} style={{ color: "#fff", textDecoration: "underline" }}>
          Return to lobby
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#9ca3af" }}>
      <p>Connecting to game...</p>
    </div>
  );
}
