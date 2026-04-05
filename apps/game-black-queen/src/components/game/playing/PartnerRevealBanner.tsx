"use client";

/**
 * PartnerRevealBanner — transient notification shown when PARTNER_REVEALED fires.
 *
 * Reads `partnerRevealedId` from the store; renders nothing when null.
 * Auto-clears after PARTNER_REVEAL_TTL (set in useSocket.ts).
 *
 * Self-contained: reads its own state, zero props needed.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";

export default function PartnerRevealBanner() {
  const partnerRevealedId = useGameStore((s) => s.partnerRevealedId);
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);

  if (!partnerRevealedId) return null;

  const revealedName =
    partnerRevealedId === player?.id
      ? t("playing.your_play")
      : (room?.players.find((p) => p.id === partnerRevealedId)?.username ??
        partnerRevealedId);

  return (
    <div
      className={[
        "w-full text-center py-2 px-4",
        "bg-primary/15 border-y border-primary/40",
        "text-sm font-semibold text-foreground",
      ].join(" ")}
    >
      {t("partner.revealed_label")}: {revealedName}
    </div>
  );
}
