"use client";

/**
 * HaathFlash — transient banner shown after each completed haath.
 *
 * Reads `haathFlash` from the store; renders nothing when null.
 * Displays the haath winner's name until the next card is played (at which
 * point useSocket clears the flash via setHaathFlash(null)).
 *
 * Self-contained: reads its own state, zero props needed.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";

export default function HaathFlash() {
  const haathFlash = useGameStore((s) => s.stackFlash);
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);

  if (!haathFlash) return null;

  const winnerName =
    haathFlash.winner === player?.id
      ? t("playing.your_play")
      : (room?.players.find((p) => p.id === haathFlash.winner)?.username ??
        haathFlash.winner);

  return (
    <div
      className={[
        "w-full text-center py-2 px-4",
        "bg-surface border-y border-border",
        "text-sm font-medium text-foreground",
      ].join(" ")}
    >
      {t("playing.haath_flash_winner")} {winnerName}
    </div>
  );
}
