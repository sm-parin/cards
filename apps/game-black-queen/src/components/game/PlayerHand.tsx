"use client";

/**
 * PlayerHand — renders the local player's current card hand.
 *
 * Displays card strings as text (e.g. "Q♠", "10♥").
 * No interactivity yet — gameplay actions are a future task.
 *
 * Pure presentational component; receives cards as props.
 */

import { t } from "@/utils/i18n";
import type { Card } from "@/types";

interface Props {
  cards: Card[];
}

export default function PlayerHand({ cards }: Props) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">
        {t("game.hand_empty")}
      </p>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 text-center">
        {t("game.hand_title")}
      </h3>

      {/* Card list — horizontal scroll for large hands */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {cards.map((card) => (
          <div
            key={card}
            className={[
              "flex items-center justify-center",
              "w-12 h-16 rounded-lg border border-border",
              "bg-surface text-foreground font-semibold text-sm",
              "select-none",
            ].join(" ")}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
