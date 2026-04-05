"use client";

/**
 * Hand — interactive card hand for the playing phase.
 *
 * Responsibilities:
 *   - Renders the player's current cards using the Card primitive.
 *   - Computes valid plays based on the current led suit (UI-level hint only;
 *     backend is the authoritative source of truth).
 *   - Emits PLAY_CARD via socketEmitter on valid card click.
 *   - Disables all interaction when it is not the player's turn.
 *
 * Replaces the static PlayerHand component in the playing phase.
 */

import { useState, useEffect } from "react";
import { t } from "@/utils/i18n";
import { emitPlayCard } from "@/utils/socketEmitter";
import { getValidCards } from "@/utils/cardUtils";
import { useGameStore } from "@/store/gameStore";
import Card from "@/components/game/playing/Card";
import type { Suit, Card as CardType } from "@/types";

interface Props {
  cards: CardType[];
  /** Suit of the first card played in the current stack — null at round start */
  currentSuit: Suit | null;
  /** True when it is this player's turn to play */
  isMyTurn: boolean;
  roomId: string;
}

export default function Hand({ cards, currentSuit, isMyTurn, roomId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const gameNotification = useGameStore((s) => s.gameNotification);
  const validCards = getValidCards(cards, currentSuit);

  // Reset lock when the turn changes (turn passed to another player)
  useEffect(() => {
    if (!isMyTurn) setSubmitted(false);
  }, [isMyTurn]);

  // Reset lock when a new trick starts.
  // When the trick winner played last, currentPlayerId doesn't change so isMyTurn
  // stays true and the effect above never fires. Watching currentSuit (null between
  // tricks) catches this case so the winner can lead the next trick.
  useEffect(() => {
    if (currentSuit === null) setSubmitted(false);
  }, [currentSuit]);

  // Reset lock when a server error arrives (e.g. "You must follow suit")
  // so the player can try again on their still-active turn
  useEffect(() => {
    if (gameNotification) setSubmitted(false);
  }, [gameNotification]);

  const handleCardClick = (card: CardType) => {
    if (submitted) return;
    setSubmitted(true);
    emitPlayCard({ roomId, card });
  };

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">
        {t("game.hand_empty")}
      </p>
    );
  }

  const interactive = isMyTurn && !submitted;

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 text-center">
        {t("game.hand_title")}
      </h3>

      {/* Turn status hint */}
      {!isMyTurn && (
        <p className="text-xs text-muted text-center mb-2">
          {t("playing.not_your_turn")}
        </p>
      )}

      {/* Card grid */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {cards.map((card) => (
          <Card
            key={card}
            card={card}
            disabled={!interactive}
            valid={validCards.has(card)}
            onClick={interactive ? handleCardClick : undefined}
          />
        ))}
      </div>
    </div>
  );
}
