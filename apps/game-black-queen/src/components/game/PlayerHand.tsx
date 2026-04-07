"use client";

/**
 * PlayerHand — static card display (bidding + partner-selection phases).
 * Uses @cards/ui CardHand for consistent card visuals.
 */

import { CardHand } from "@cards/ui";
import type { Card } from "@/types";

interface Props {
  cards: Card[];
}

export default function PlayerHand({ cards }: Props) {
  if (cards.length === 0) return null;
  return <CardHand cards={cards} size="md" />;
}
