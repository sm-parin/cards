"use client";

/**
 * LobbyScreen — displayed after the player has joined a room.
 *
 * Shows:
 * - Room ID
 * - Real-time player count (X / maxPlayers)
 * - Player list (updates on ROOM_UPDATE)
 * - Start Game button (visible only when >= MIN_PLAYERS_TO_START have joined)
 *
 * All socket emissions go through socketEmitter — no direct socket access here.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { emitStartGame, emitLeaveRoom, emitUpdateMaxPlayers, emitPlayNow } from "@/utils/socketEmitter";
import Button from "@/components/ui/Button";
import PlayerList from "@/components/lobby/PlayerList";

const PLAYER_OPTIONS = [5, 6, 7, 8, 9, 10];

export default function LobbyScreen() {
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);
  const roomPasskey = useGameStore((s) => s.roomPasskey);
  const resetGame = useGameStore((s) => s.resetGame);
  const setMaxPlayers = useGameStore((s) => s.setMaxPlayers);

  if (!room) return null;

  const playerCount = room.players.length;
  const canStart = playerCount >= room.maxPlayers;
  const isCreator = room.players[0]?.id === player?.id;

  // Show the passkey to whoever is currently the room creator.
  // room.passkey is always present on private rooms (sent in ROOM_JOINED/ROOM_UPDATE).
  // roomPasskey from store is a fallback for the original creator before ROOM_UPDATE arrives.
  const displayPasskey = room.isPrivate ? (room.passkey ?? roomPasskey) : null;

  const handleStartGame = () => {
    emitStartGame({ roomId: room.roomId });
  };

  const handleLeaveRoom = () => {
    emitLeaveRoom(room.roomId);
    resetGame();
  };

  const handleMatchAgain = () => {
    const roomId = room.roomId;
    emitLeaveRoom(roomId);
    resetGame();
    emitPlayNow(roomId); // exclude the just-left room so matchmaking doesn't reassign there
  };

  const handleSetMaxPlayers = (n: number) => {
    setMaxPlayers(n); // optimistic — creator sees the change instantly
    emitUpdateMaxPlayers(room.roomId, n);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col gap-6 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">
            {t("lobby.waiting")}
          </h2>

          {/* Room ID */}
          <p className="text-sm text-muted">
            {t("lobby.room_id")}: {room.roomId}
          </p>

          {/* Passkey — shown to the current room creator for private rooms */}
          {isCreator && displayPasskey && (
            <p className="text-sm font-mono font-semibold text-primary tracking-widest">
              {t("lobby.passkey")}: {displayPasskey}
            </p>
          )}
        </div>

        {/* Player count */}
        <p className="text-lg font-semibold text-foreground">
          {playerCount}/{room.maxPlayers} {t("lobby.players")}
        </p>

        {/* Creator-only: max players picker */}
        {isCreator && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("lobby.max_players_label")}
            </span>
            <div className="flex gap-1.5">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => handleSetMaxPlayers(n)}
                  disabled={n < playerCount}
                  className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    room.maxPlayers === n
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted border-border hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player list — updates in real-time via ROOM_UPDATE */}
        <PlayerList players={room.players} selfId={player?.id ?? null} />

        {/* Creator: Start Game when full; non-creator: Match Again */}
        {isCreator ? (
          canStart ? (
            <Button variant="primary" fullWidth onClick={handleStartGame}>
              {t("lobby.start_game")}
            </Button>
          ) : (
            <p className="text-sm text-muted text-center">
              {t("lobby.start_game_hint")} ({playerCount}/{room.maxPlayers})
            </p>
          )
        ) : (
          <Button variant="outline" fullWidth onClick={handleMatchAgain}>
            {t("lobby.match_again")}
          </Button>
        )}

        {/* Leave Room */}
        <Button variant="outline" fullWidth onClick={handleLeaveRoom}>
          {t("lobby.leave_room")}
        </Button>
      </div>
    </main>
  );
}
