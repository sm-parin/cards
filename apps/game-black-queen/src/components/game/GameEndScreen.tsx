"use client";

/**
 * GameEndScreen — full-screen result view shown when game.phase === "ended".
 *
 * Displays:
 *   - Winning team label
 *   - Final scores for both teams (bidding vs opponent)
 *   - Bid target that the bidding team needed to reach
 *   - Player lists per team
 *   - Exit button — leaves the room on the backend and resets store → HomeScreen
 *
 * Reads from gameEndResult (full GAME_ENDED payload) and room.players
 * to resolve player display names.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import Button from "@/components/ui/Button";
import { emitLeaveRoom } from "@/utils/socketEmitter";

export default function GameEndScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const player = useGameStore((s) => s.player);
  const gameEndResult = useGameStore((s) => s.gameEndResult);
  const resetGame = useGameStore((s) => s.resetGame);

  // Fallback to score stored in gameState if full payload not available
  const scores = gameEndResult?.scores ?? gameState?.score;
  const winnerTeam = gameEndResult?.winnerTeam ?? null;
  const bidTarget = gameEndResult?.bidTarget ?? null;
  const biddingTeamIds = gameEndResult?.biddingTeam ?? [];
  const opponentTeamIds = gameEndResult?.opponentTeam ?? [];
  const players = room?.players ?? [];
  const myDelta = gameEndResult?.coinDeltas?.[player?.id ?? ""] ?? 0; // COIN SYSTEM DISABLED — unused

  /** Resolve display name for a player ID */
  const resolveName = (id: string): string => {
    const name = players.find((p) => p.id === id)?.username ?? id;
    const isSelf = id === player?.id;
    return isSelf ? `${name} ${t("end.you")}` : name;
  };

  const handleExit = () => {
    if (room) emitLeaveRoom(room.roomId);
    resetGame();
  };

  const winnerLabel =
    winnerTeam === "bidding"
      ? t("end.winner_bidding")
      : winnerTeam === "opponent"
        ? t("end.winner_opponent")
        : winnerTeam === "none"
          ? t("end.winner_none")
          : t("end.title");

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
      <div className="flex flex-col gap-8 w-full max-w-md">
        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {t("end.title")}
          </h1>
          <p className="text-xl font-semibold text-primary mt-2">
            {winnerLabel}
          </p>
        </div>

        {/* ── Coin delta ────────────────────────────────────────────────── */}
        {/* COIN SYSTEM DISABLED
        {myDelta !== 0 && (
          <p
            className={[
              "text-center text-lg font-semibold",
              myDelta > 0 ? "text-green-400" : "text-red-400",
            ].join(" ")}
          >
            {myDelta > 0 ? "+" : ""}
            {myDelta} {t("end.coins")}
          </p>
        )}
        */}

        {/* ── Score board ───────────────────────────────────────────────── */}
        {scores && (
          <div className="flex gap-4">
            {/* Bidding team */}
            <div
              className={[
                "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border",
                winnerTeam === "bidding"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("end.team_bidding")}
              </span>
              <span className="text-4xl font-bold text-foreground tabular-nums">
                {scores.teamA}
              </span>
              {bidTarget !== null && (
                <span className="text-xs text-muted">
                  {t("end.bid_target")}: {bidTarget}
                </span>
              )}
            </div>

            {/* Opponent team */}
            <div
              className={[
                "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border",
                winnerTeam === "opponent"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("end.team_opponent")}
              </span>
              <span className="text-4xl font-bold text-foreground tabular-nums">
                {scores.teamB}
              </span>
            </div>
          </div>
        )}

        {/* ── Team rosters ──────────────────────────────────────────────── */}
        {(biddingTeamIds.length > 0 || opponentTeamIds.length > 0) && (
          <div className="flex gap-4">
            {/* Bidding team players */}
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("end.team_bidding")}
              </span>
              {biddingTeamIds.map((id) => (
                <span
                  key={id}
                  className="text-sm text-foreground py-1 px-3 rounded-lg bg-surface border border-border"
                >
                  {resolveName(id)}
                </span>
              ))}
            </div>

            {/* Opponent team players */}
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("end.team_opponent")}
              </span>
              {opponentTeamIds.map((id) => (
                <span
                  key={id}
                  className="text-sm text-foreground py-1 px-3 rounded-lg bg-surface border border-border"
                >
                  {resolveName(id)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Exit ──────────────────────────────────────────────────────── */}
        <Button variant="primary" fullWidth onClick={handleExit}>
          {t("end.exit")}
        </Button>
      </div>
    </div>
  );
}
