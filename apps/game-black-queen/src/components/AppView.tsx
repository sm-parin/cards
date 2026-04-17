use client;

/**
 * AppView — top-level renderer.
 *
 * View routing:
 *   gameState exists   ? GameScreen (game in progress or ended)
 *   room exists        ? GameScreen (REJOIN_SUCCESS received, gameState arriving)
 *   timed out          ? Error: no session found, link back to shell
 *   otherwise          ? Loading: waiting for REJOIN_SUCCESS from server
 *
 * Game entry is always via shell lobby. The game app never shows a lobby.
 * On load: socket connects ? INIT_PLAYER emitted ? server sends REJOIN_SUCCESS
 * with the active room+game state ? GameScreen renders.
 */

import { useEffect, useState } from react;
import { useGameStore } from @/store/gameStore;
import GameScreen from @/components/game/GameScreen;

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL || http://localhost:3000;
const REJOIN_TIMEOUT_MS = 8000;

export default function AppView() {
  const room = useGameStore((s) => s.room);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (room) return;
    const t = setTimeout(() => setTimedOut(true), REJOIN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [room]);

  if (room) return <GameScreen />;

  if (timedOut) {
    return (
      <div style={{ display: flex, flexDirection: column, alignItems: center, justifyContent: center, minHeight: 100vh, gap: 16px, color: #9ca3af }}>
        <p style={{ margin: 0 }}>No active game session found.</p>
        <a href={\${SHELL_URL}/explore} style={{ color: #fff, textDecoration: underline }}>
          Return to lobby
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: flex, alignItems: center, justifyContent: center, minHeight: 100vh, color: #9ca3af }}>
      <p>Connecting to game...</p>
    </div>
  );
}
