"use client";

/**
 * Card — the reusable playing card primitive.
 *
 * Visual states:
 *   - Default:  neutral border, bg-surface
 *   - Valid:    full opacity, hover lift effect (when clickable)
 *   - Invalid:  dimmed (player has cards of the led suit but this isn't one)
 *   - Disabled: non-interactive, cursor-not-allowed (not player's turn)
 *
 * Suit colour is derived automatically:
 *   ♥ / ♦ → red    ♣ / ♠ → foreground
 */

import type { Card as CardType } from "@/types";
import { isRed } from "@/utils/cardUtils";

interface Props {
  card: CardType;
  /** Called when the card is clicked — only fires if not disabled */
  onClick?: (card: CardType) => void;
  /** True if it is not the player's turn — suppresses all interaction */
  disabled?: boolean;
  /**
   * Whether this card is a valid play given the current suit.
   * Defaults to true. Invalid cards are dimmed for guidance — backend
   * still enforces correctness.
   */
  valid?: boolean;
}

export default function Card({
  card,
  onClick,
  disabled = false,
  valid = true,
}: Props) {
  const red = isRed(card);
  const interactive = !disabled && onClick !== undefined;

  const handleClick = () => {
    if (!disabled && onClick) onClick(card);
  };

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) handleClick();
      }}
      className={[
        // Base layout
        "flex items-center justify-center",
        "w-12 h-16 rounded-lg border text-sm font-bold select-none",
        "transition-all duration-100",
        // Suit colour
        red ? "text-red-500" : "text-foreground",
        // Interactive states
        interactive && valid
          ? "border-primary bg-surface cursor-pointer hover:-translate-y-1 hover:shadow-md active:translate-y-0"
          : "",
        // Non-interactive / turn blocked
        disabled ? "border-border bg-surface opacity-50 cursor-not-allowed" : "",
        // Invalid card (has led suit but this card isn't it)
        !disabled && !valid ? "border-border bg-surface opacity-40 cursor-not-allowed" : "",
        // Default non-disabled, non-interactive (e.g. stack display)
        !disabled && !interactive ? "border-border bg-surface" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {card}
    </div>
  );
}
