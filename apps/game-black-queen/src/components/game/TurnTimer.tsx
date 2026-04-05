"use client";

/**
 * TurnTimer — countdown displayed when it is the local player's turn.
 *
 * Resets to TURN_SECONDS on every change of `currentPlayerId`.
 * When the countdown reaches 0 during the bidding phase, automatically
 * emits PASS_BID so the turn advances without server-side intervention.
 *
 * Renders nothing when it is not the local player's turn.
 */

import { useEffect, useState } from "react";
import { t } from "@/utils/i18n";
import { useGameStore } from "@/store/gameStore";
import { emitPassBid, emitPlayCard } from "@/utils/socketEmitter";
import { getAutoPlayCard } from "@/utils/autoPlay";

/** Seconds given per turn (display only — no enforcement) */
const TURN_SECONDS = 30;

export default function TurnTimer() {
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const player = useGameStore((s) => s.player);
  const gameState = useGameStore((s) => s.gameState);
  const room = useGameStore((s) => s.room);

  const isMyTurn = currentPlayerId !== null && currentPlayerId === player?.id;

  const [seconds, setSeconds] = useState<number>(TURN_SECONDS);

  /** Reset and start countdown whenever it becomes this player's turn */
  useEffect(() => {
    if (!isMyTurn) return;

    setSeconds(TURN_SECONDS);

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, currentPlayerId]);

  /** Auto-pass when time runs out during bidding */
  useEffect(() => {
    if (seconds === 0 && isMyTurn && gameState?.phase === "bidding" && room) {
      emitPassBid({ roomId: room.roomId });
    }
  }, [seconds]);

  /** Auto-play when time runs out during playing phase */
  useEffect(() => {
    if (seconds === 0 && isMyTurn && gameState?.phase === "playing" && room) {
      const hand = player?.hand ?? [];
      if (hand.length === 0) return;
      try {
        const card = getAutoPlayCard(
          hand,
          gameState.currentSuit ?? null,
          gameState.masterSuit ?? null,
          gameState.currentStack ?? [],
        );
        emitPlayCard({ roomId: room.roomId, card });
      } catch {
        // hand unexpectedly empty — nothing to do
      }
    }
  }, [seconds]);

  if (!isMyTurn) return null;

  const pct = (seconds / TURN_SECONDS) * 100;
  const urgent = seconds <= 10;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
      <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
        {t("timer.your_turn_label")}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div
          className={[
            "h-full rounded-full transition-all duration-1000",
            urgent ? "bg-red-500" : "bg-primary",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span
        className={[
          "text-sm font-bold tabular-nums shrink-0 w-8 text-right",
          urgent ? "text-red-500" : "text-foreground",
        ].join(" ")}
      >
        {seconds}
        {t("timer.seconds_suffix")}
      </span>
    </div>
  );
}
