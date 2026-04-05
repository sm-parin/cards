"use client";

/**
 * BiddingPanel — displays bidding state and conditionally renders BidControls.
 *
 * Shows:
 *   - Current highest bid
 *   - Highest bidder name
 *   - Turn-aware controls:
 *       • Player's turn + not passed → BidControls
 *       • Player passed              → "You passed" notice
 *       • Other player's turn        → "Waiting..." notice
 *
 * Reads all state from the Zustand store.
 * Only renders when game.phase === "bidding" — GameScreen guards this.
 */

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import BidControls from "@/components/game/bidding/BidControls";

export default function BiddingPanel() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const player = useGameStore((s) => s.player);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);

  if (!room || !gameState) return null;

  const { bidding, deckCount } = gameState;

  /** Resolve highest bidder display name */
  const highestBidderName = bidding.highestBidder
    ? (room.players.find((p) => p.id === bidding.highestBidder)?.username ??
      bidding.highestBidder)
    : t("bidding.nobody");

  const isMyTurn = currentPlayerId !== null && currentPlayerId === player?.id;
  const hasPassed = player?.hasPassed ?? false;

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm mx-auto px-4 py-5">
      {/* ── Bid summary ───────────────────────────────────────────────────── */}
      <div className="flex gap-6 justify-center">
        {/* Current bid */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted uppercase tracking-wider">
            {t("bidding.current_bid")}
          </span>
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {bidding.currentBid === 0
              ? t("bidding.no_bid_yet")
              : bidding.currentBid}
          </span>
        </div>

        {/* Highest bidder */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted uppercase tracking-wider">
            {t("bidding.highest_bidder")}
          </span>
          <span className="text-lg font-semibold text-foreground">
            {highestBidderName}
          </span>
        </div>
      </div>

      {/* ── Turn-aware controls ───────────────────────────────────────────── */}
      {hasPassed ? (
        /* Player has already passed — no further actions */
        <p className="text-sm text-muted text-center py-2">
          {t("bidding.you_passed")}
        </p>
      ) : isMyTurn ? (
        /* It is this player's turn — show bid controls */
        <BidControls
          currentBid={bidding.currentBid}
          deckCount={deckCount}
          roomId={room.roomId}
        />
      ) : (
        /* Another player is bidding */
        <p className="text-sm text-muted text-center py-2">
          {t("bidding.waiting")}
        </p>
      )}
    </div>
  );
}
