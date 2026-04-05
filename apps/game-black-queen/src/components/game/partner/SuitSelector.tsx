"use client";

/**
 * SuitSelector — four suit buttons for the highest bidder to pick the master suit.
 *
 * Pure presentational component; emits upward via onSelect callback.
 * Caller is responsible for emitting SELECT_MASTER_SUIT to the server.
 */

import { t } from "@/utils/i18n";
import type { Suit } from "@/types";
import { SUITS } from "@/config/gameRules";

interface Props {
  onSelect: (suit: Suit) => void;
}

/** Colour associations for suit display */
const SUIT_COLORS: Record<Suit, string> = {
  "♥": "text-red-500",
  "♦": "text-red-500",
  "♣": "text-foreground",
  "♠": "text-foreground",
};

export default function SuitSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <div className="flex flex-col gap-1 text-center">
        <h3 className="text-base font-semibold text-foreground">
          {t("partner.select_suit_title")}
        </h3>
        <p className="text-xs text-muted">{t("partner.select_suit_hint")}</p>
      </div>

      {/* Four suit buttons */}
      <div className="flex gap-3">
        {SUITS.map((suit) => (
          <button
            key={suit}
            onClick={() => onSelect(suit as Suit)}
            className={[
              "flex items-center justify-center",
              "w-16 h-16 rounded-xl border-2 border-border bg-surface",
              "text-3xl font-bold transition-colors duration-150",
              "hover:border-primary hover:bg-primary/10",
              "cursor-pointer",
              SUIT_COLORS[suit as Suit],
            ].join(" ")}
            aria-label={`Select ${suit}`}
          >
            {suit}
          </button>
        ))}
      </div>
    </div>
  );
}
