"use client";

/**
 * PartnerCardSelector — lets the highest bidder choose 1 or 2 partner cards.
 *
 * Renders one card picker per required card (1 for single deck, 2 for double).
 * Each picker has a value dropdown (2–A) and a suit dropdown (♥ ♣ ♦ ♠).
 * Combines them into the "Q♠" format expected by SELECT_PARTNER.
 *
 * Pure presentational component; emits upward via onConfirm callback.
 */

import { useState } from "react";
import { Button } from "@cards/ui";
import { t } from "@/utils/i18n";
import { CARD_VALUES, SUITS } from "@/config/gameRules";
import type { Suit, Card } from "@/types";

interface CardPicker {
  value: string;
  suit: Suit;
}

interface Props {
  deckCount: 1 | 2;
  onConfirm: (cards: Card[]) => void;
}

const DEFAULT_PICKER: CardPicker = { value: "Q", suit: "♠" };

export default function PartnerCardSelector({ deckCount, onConfirm }: Props) {
  const [pickers, setPickers] = useState<CardPicker[]>(
    Array.from({ length: deckCount }, () => ({ ...DEFAULT_PICKER }))
  );

  const updatePicker = (
    index: number,
    field: keyof CardPicker,
    value: string
  ) => {
    setPickers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleConfirm = () => {
    const cards: Card[] = pickers.map((p) => `${p.value}${p.suit}`);
    onConfirm(cards);
  };

  const title =
    deckCount === 1
      ? t("partner.select_cards_title")
      : t("partner.select_cards_title_plural");

  return (
    <div className="flex flex-col gap-5 w-full">
      <h3 className="text-base font-semibold text-foreground text-center">
        {title}
      </h3>

      {/* One picker row per required card */}
      {pickers.map((picker, index) => (
        <div key={index} className="flex flex-col gap-2">
          {deckCount === 2 && (
            <span className="text-xs text-muted uppercase tracking-wider">
              {t("partner.card_label")} {index + 1}
            </span>
          )}

          <div className="flex gap-3">
            {/* Value dropdown */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted">
                {t("partner.card_value")}
              </label>
              <select
                value={picker.value}
                onChange={(e) => updatePicker(index, "value", e.target.value)}
                className={[
                  "w-full px-3 py-2 rounded-lg border border-border",
                  "bg-surface text-foreground text-sm",
                  "focus:outline-none focus:border-primary",
                ].join(" ")}
              >
                {CARD_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Suit dropdown */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted">
                {t("partner.card_suit")}
              </label>
              <select
                value={picker.suit}
                onChange={(e) =>
                  updatePicker(index, "suit", e.target.value as Suit)
                }
                className={[
                  "w-full px-3 py-2 rounded-lg border border-border",
                  "bg-surface text-foreground text-sm",
                  "focus:outline-none focus:border-primary",
                ].join(" ")}
              >
                {SUITS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview of combined card string */}
            <div className="flex flex-col gap-1 items-center justify-end">
              <span className="text-2xl font-bold text-foreground select-none">
                {picker.value}
                {picker.suit}
              </span>
            </div>
          </div>
        </div>
      ))}

      <Button variant="primary" fullWidth onClick={handleConfirm}>
        {t("partner.confirm")}
      </Button>
    </div>
  );
}
