"use client";

/**
 * PartnerSelection — orchestrates the two-step partner selection flow.
 *
 * Rendered during game.phase === "partner-selection".
 *
 * For the highest bidder — two sequential steps:
 *   Step 1: masterSuit === null
 *           → <SuitSelector> — emit SELECT_MASTER_SUIT
 *   Step 2: masterSuit set, partner.selectedCards empty
 *           → <PartnerCardSelector> — emit SELECT_PARTNER
 *   Step 3: both set
 *           → "Waiting for game to start..."
 *
 * For everyone else:
 *   → "Waiting for bidder to choose..."
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { emitSelectMasterSuit, emitSelectPartner } from "@/utils/socketEmitter";
import SuitSelector from "@/components/game/partner/SuitSelector";
import PartnerCardSelector from "@/components/game/partner/PartnerCardSelector";
import type { Suit, Card } from "@/types";

export default function PartnerSelection() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const player = useGameStore((s) => s.player);

  if (!room || !gameState) return null;

  const { masterSuit, partner, bidding, deckCount } = gameState;
  const isBidder = player?.id === bidding.highestBidder;
  const suitChosen = masterSuit !== null;
  const cardsChosen = partner.selectedCards.length > 0;

  /** Step 1 handler — emit SELECT_MASTER_SUIT */
  const handleSuitSelect = (suit: Suit) => {
    emitSelectMasterSuit({ roomId: room.roomId, suit });
  };

  /** Step 2 handler — emit SELECT_PARTNER */
  const handleCardsConfirm = (cards: Card[]) => {
    emitSelectPartner({ roomId: room.roomId, cards });
  };

  /* ── Non-bidder view ──────────────────────────────────────────────────── */
  if (!isBidder) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted text-center">
          {t("partner.waiting")}
        </p>
      </div>
    );
  }

  /* ── Bidder: both selections complete ────────────────────────────────── */
  if (suitChosen && cardsChosen) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted text-center">
          {t("partner.waiting_start")}
        </p>
      </div>
    );
  }

  /* ── Bidder: step 1 — select master suit ────────────────────────────── */
  if (!suitChosen) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm mx-auto px-4 py-5">
        <SuitSelector onSelect={handleSuitSelect} />
      </div>
    );
  }

  /* ── Bidder: step 2 — select partner card(s) ────────────────────────── */
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto px-4 py-5">
      {/* Show chosen suit as context */}
      <div className="flex items-center gap-2 justify-center">
        <span className="text-xs text-muted uppercase tracking-wider">
          {t("partner.suit_selected")}:
        </span>
        <span className="text-2xl font-bold text-foreground">{masterSuit}</span>
      </div>

      <PartnerCardSelector
        deckCount={deckCount}
        onConfirm={handleCardsConfirm}
      />
    </div>
  );
}
