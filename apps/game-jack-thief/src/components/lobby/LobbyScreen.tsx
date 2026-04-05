"use client";

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import {
  emitJtStartGame,
  emitLeaveRoom,
  emitUpdateMaxPlayers,
  emitPlayNow,
} from "@/utils/socketEmitter";
import Button from "@/components/ui/Button";
import PlayerList from "@/components/lobby/PlayerList";

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function LobbyScreen() {
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);
  const roomPasskey = useGameStore((s) => s.roomPasskey);
  const resetGame = useGameStore((s) => s.resetGame);
  const setMaxPlayers = useGameStore((s) => s.setMaxPlayers);

  if (!room) return null;

  const playerCount = room.players.length;
  const isCreator = room.players[0]?.id === player?.id;
  const canStart = playerCount >= 2;
  const displayPasskey = room.isPrivate ? (room.passkey ?? roomPasskey) : null;

  const handleStartGame = () => {
    emitJtStartGame({ roomId: room.roomId });
  };

  const handleLeaveRoom = () => {
    emitLeaveRoom(room.roomId);
    resetGame();
  };

  const handleMatchAgain = () => {
    const roomId = room.roomId;
    emitLeaveRoom(roomId);
    resetGame();
    emitPlayNow(roomId);
  };

  const handleSetMaxPlayers = (n: number) => {
    setMaxPlayers(n);
    emitUpdateMaxPlayers(room.roomId, n);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col gap-6 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">{t("lobby.waiting")}</h2>
          <p className="text-sm text-muted">
            {t("lobby.room_id")}: {room.roomId}
          </p>
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
            <div className="flex flex-wrap gap-1">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => handleSetMaxPlayers(n)}
                  disabled={n < playerCount}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
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

        <PlayerList players={room.players} selfId={player?.id ?? null} />

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

        <Button variant="outline" fullWidth onClick={handleLeaveRoom}>
          {t("lobby.leave_room")}
        </Button>
      </div>
    </main>
  );
}
