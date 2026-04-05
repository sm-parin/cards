"use client";

/**
 * BidControls — lets the active player select and submit a bid or pass.
 *
 * Rendered only when it is the local player's turn during bidding.
 *
 * Controls:
 *   − / + buttons: adjust selected amount in 5-point steps
 *   Quick +5 / +10 buttons: relative bump from current selection
 *   Place Bid: emits PLACE_BID with the selected amount
 *   Pass: emits PASS_BID
 *
 * All emit calls go through socketEmitter — no direct socket access here.
 */

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { t } from "@/utils/i18n";
import { emitPlaceBid, emitPassBid } from "@/utils/socketEmitter";
import {
  getNextMinBid,
  getMaxBid,
  getBidIncrement,
  clampBid,
} from "@/utils/bidUtils";

interface Props {
  currentBid: number;
  deckCount: 1 | 2;
  roomId: string;
}

export default function BidControls({ currentBid, deckCount, roomId }: Props) {
  const nextMin = getNextMinBid(currentBid, deckCount);
  const maxBid = getMaxBid(deckCount);
  const step = getBidIncrement(deckCount);

  /** Selected bid amount — starts at the minimum valid next bid */
  const [amount, setAmount] = useState<number>(nextMin);
  /** Locked after first submit — prevents double-firing before phase transitions */
  const [submitted, setSubmitted] = useState(false);

  /**
   * When the current bid changes (another player bid), clamp the
   * local selection upward to keep it valid.
   */
  useEffect(() => {
    setAmount((prev) => clampBid(prev, currentBid, deckCount));
  }, [currentBid, deckCount]);

  const canDecrease = amount - step >= nextMin;
  const canIncrease = amount + step <= maxBid;

  const decrease = () => setAmount((a) => a - step);
  const increase = () => setAmount((a) => a + step);

  /** Relative quick-add, clamped to maxBid */
  const addQuick = (delta: number) =>
    setAmount((a) => Math.min(a + delta, maxBid));

  const handlePlaceBid = () => {
    if (submitted) return;
    setSubmitted(true);
    emitPlaceBid({ roomId, amount });
  };

  const handlePass = () => {
    if (submitted) return;
    setSubmitted(true);
    emitPassBid({ roomId });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Amount selector ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {t("bidding.your_bid_amount")}
        </span>

        <div className="flex items-center gap-3">
          {/* Decrement */}
          <Button
            variant="outline"
            className="w-10 h-10 p-0 text-lg"
            onClick={decrease}
            disabled={!canDecrease}
            aria-label="Decrease bid"
          >
            −
          </Button>

          {/* Current selected amount */}
          <span className="flex-1 text-center text-2xl font-bold text-foreground tabular-nums">
            {amount}
          </span>

          {/* Increment */}
          <Button
            variant="outline"
            className="w-10 h-10 p-0 text-lg"
            onClick={increase}
            disabled={!canIncrease}
            aria-label="Increase bid"
          >
            +
          </Button>
        </div>
      </div>

      {/* ── Quick-add buttons ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 py-2 text-sm"
          onClick={() => addQuick(step)}
          disabled={amount + step > maxBid}
        >
          +{step}
        </Button>
        <Button
          variant="outline"
          className="flex-1 py-2 text-sm"
          onClick={() => addQuick(step * 2)}
          disabled={amount + step * 2 > maxBid}
        >
          +{step * 2}
        </Button>
        <Button
          variant="outline"
          className="flex-1 py-2 text-sm"
          onClick={() => addQuick(step * 3)}
          disabled={amount + step * 3 > maxBid}
        >
          +{step * 3}
        </Button>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button variant="primary" fullWidth onClick={handlePlaceBid} disabled={submitted}>
          {t("bidding.place_bid")}
        </Button>
        <Button variant="outline" fullWidth onClick={handlePass} disabled={submitted}>
          {t("bidding.pass")}
        </Button>
      </div>
    </div>
  );
}
