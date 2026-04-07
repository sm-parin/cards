"use client";

/**
 * Hand — interactive card hand for the playing phase.
 *
 * Uses @cards/ui CardHand for rendering.
 * Valid-play logic (UI hint only): cards of wrong suit are dimmed.
 * Backend enforces correctness on every PLAY_CARD event.
 */

import { useState, useEffect } from "react";
import { emitPlayCard } from "@/utils/socketEmitter";
import { getValidCards } from "@/utils/cardUtils";
import { useGameStore } from "@/store/gameStore";
import { CardHand } from "@cards/ui";
import type { Suit, Card as CardType } from "@/types";

interface Props {
  cards: CardType[];
  currentSuit: Suit | null;
  isMyTurn: boolean;
  roomId: string;
}

export default function Hand({ cards, currentSuit, isMyTurn, roomId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const gameNotification = useGameStore((s) => s.gameNotification);
  const validCards = getValidCards(cards, currentSuit);

  useEffect(() => {
    if (!isMyTurn) setSubmitted(false);
  }, [isMyTurn]);

  useEffect(() => {
    if (currentSuit === null) setSubmitted(false);
  }, [currentSuit]);

  useEffect(() => {
    if (gameNotification) setSubmitted(false);
  }, [gameNotification]);

  if (cards.length === 0) return null;

  const interactive = isMyTurn && !submitted;

  const disabledCards = interactive
    ? cards.filter((c) => !validCards.has(c))
    : [...cards]; // not my turn — all disabled

  const handleCardClick = (card: CardType) => {
    if (!interactive) return;
    setSubmitted(true);
    emitPlayCard({ roomId, card });
  };

  return (
    <CardHand
      cards={cards}
      size="md"
      disabledCards={disabledCards}
      onCardClick={interactive ? handleCardClick : undefined}
    />
  );
}
