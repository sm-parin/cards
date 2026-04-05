"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { getRank, isRed } from "@/utils/cardUtils";
import { emitJtDiscardPair, emitJtReorderHand } from "@/utils/socketEmitter";
import type { Card } from "@/types";

export default function PreGameScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const hand = useGameStore((s) => s.hand);
  const setHand = useGameStore((s) => s.setHand);
  const gameNotification = useGameStore((s) => s.gameNotification);

  const [timeLeft, setTimeLeft] = useState<number>(gameState?.duration ?? 40);
  const [selected, setSelected] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const handleCardClick = (card: Card, index: number) => {
    if (!room || !gameState) return;

    if (selected === null) {
      setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const cardA = hand[selected];
    const cardB = card;

    if (getRank(cardA) === getRank(cardB)) {
      emitJtDiscardPair({ roomId: room.roomId, cards: [cardA, cardB] });
      setSelected(null);
    } else {
      // Different rank — replace selection
      setSelected(index);
    }
  };

  const handleCardDrop = (dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;
    dragIndexRef.current = null;
    const newHand = [...hand];
    const [dragged] = newHand.splice(dragIndex, 1);
    newHand.splice(dropIndex, 0, dragged);
    // Build permutation tracking duplicates
    const remaining = hand.map((c, i) => ({ c, i }));
    const usedSet = new Set<number>();
    const cardOrder = newHand.map((card) => {
      const match = remaining.find(({ c, i }) => c === card && !usedSet.has(i));
      if (!match) return 0;
      usedSet.add(match.i);
      return match.i;
    });
    setHand(newHand);
    setSelected(null);
    if (room) emitJtReorderHand({ roomId: room.roomId, cardOrder });
  };

  if (!gameState) return null;

  const isSpectating = hand.length === 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="flex flex-col gap-6 w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("pregame.title")}</h1>
          <p className="text-sm text-muted mt-1">{t("pregame.subtitle")}</p>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted uppercase tracking-wide font-medium">
            {t("pregame.timer_label")}
          </span>
          <span
            className={[
              "text-5xl font-bold tabular-nums",
              timeLeft <= 10 ? "text-danger" : "text-foreground",
            ].join(" ")}
          >
            {timeLeft}
          </span>
        </div>

        {/* Notification */}
        {gameNotification && (
          <p className="text-center text-sm text-danger font-medium">{gameNotification}</p>
        )}

        {/* Hand */}
        <div className="flex flex-col gap-3">
          <span className="text-xs text-muted font-medium uppercase tracking-wide">
            {t("pregame.your_hand")} ({hand.length} {t("pregame.hand_size_suffix")})
          </span>

          {isSpectating ? (
            <p className="text-sm text-muted text-center py-6">{t("pregame.waiting")}</p>
          ) : (
            <>
              <p className="text-xs text-muted">{t("pregame.select_pair_hint")}</p>
              <div className="flex flex-wrap gap-2">
                {hand.map((card, i) => {
                  const red = isRed(card);
                  const isSelected = selected === i;
                  return (
                    <button
                      key={i}
                      draggable
                      onDragStart={() => { dragIndexRef.current = i; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleCardDrop(i)}
                      onClick={() => handleCardClick(card, i)}
                      className={[
                        "px-3 py-2 rounded-lg border text-sm font-semibold font-mono transition-all",
                        "cursor-grab active:cursor-grabbing",
                        red ? "text-red-500" : "text-foreground",
                        isSelected
                          ? "border-primary ring-2 ring-primary bg-primary/10 scale-105"
                          : "border-border bg-surface hover:border-primary",
                      ].join(" ")}
                    >
                      {card}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Other players' hand sizes */}
        {room && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              All Players
            </span>
            <div className="flex flex-wrap gap-2">
              {room.players.map((p) => {
                const count = gameState.handSizes[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs"
                  >
                    <span className="text-foreground font-medium">{p.username}</span>
                    <span className="text-muted">{count} cards</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
