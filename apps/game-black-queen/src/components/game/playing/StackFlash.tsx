"use client";

/**
 * StackFlash — transient banner shown after each completed stack.
 *
 * Reads `stackFlash` from the store; renders nothing when null.
 * Displays the stack winner's name until the next card is played (at which
 * point useSocket clears the flash via setStackFlash(null)).
 *
 * Self-contained: reads its own state, zero props needed.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";

export default function StackFlash() {
  const stackFlash = useGameStore((s) => s.stackFlash);
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);

  if (!stackFlash) return null;

  const winnerName =
    stackFlash.winner === player?.id
      ? t("playing.your_play")
      : (room?.players.find((p) => p.id === stackFlash.winner)?.username ??
        stackFlash.winner);

  return (
    <div
      className={[
        "w-full text-center py-2 px-4",
        "bg-surface border-y border-border",
        "text-sm font-medium text-foreground",
      ].join(" ")}
    >
      {t("playing.stack_flash_winner")} {winnerName}
    </div>
  );
}
