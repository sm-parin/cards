"use client";

import { useRef, useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { isRed, getRank } from "@/utils/cardUtils";
import { emitJtPickCard, emitJtSelectTarget, emitJtReorderHand, emitJtDiscardPair } from "@/utils/socketEmitter";

const MAX_PICKS_CONSTRAINT = 3;

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(active: boolean, durationSecs: number): number {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setRemaining(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setRemaining(durationSecs);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, durationSecs]);

  return remaining;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlayingScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const hand = useGameStore((s) => s.hand);
  const player = useGameStore((s) => s.player);
  const gameNotification = useGameStore((s) => s.gameNotification);
  const setHand = useGameStore((s) => s.setHand);

  // Drag-rearrange state
  const dragIndexRef = useRef<number | null>(null);
  // Pair-discard selection
  const [selectedForDiscard, setSelectedForDiscard] = useState<number | null>(null);

  const pickCountdown = useCountdown(gameState?.pickWindowActive ?? false, 20);

  if (!room || !gameState) return null;

  const selfId = player?.id ?? null;
  const isSelfActive = selfId ? gameState.activePlayers.includes(selfId) : false;
  const isSelfWinner = selfId ? gameState.winners.includes(selfId) : false;
  const isSelfPicker = selfId !== null && selfId === gameState.currentPickerId;
  const isSelfTarget = selfId !== null && selfId === gameState.targetPlayerId;
  const constraintActive = gameState.activePlayers.length > MAX_PICKS_CONSTRAINT;

  const currentPickerName =
    room.players.find((p) => p.id === gameState.currentPickerId)?.username ?? "...";
  const targetName =
    gameState.targetPlayerId
      ? room.players.find((p) => p.id === gameState.targetPlayerId)?.username ?? "..."
      : null;

  const handleSelectTarget = (targetPlayerId: string) => {
    if (!room || !isSelfPicker || gameState.targetPlayerId !== null) return;
    emitJtSelectTarget({ roomId: room.roomId, targetPlayerId });
  };

  const handlePickCard = (fromPlayerId: string, cardIndex: number) => {
    if (!room || !isSelfPicker || !gameState.pickWindowActive) return;
    if (fromPlayerId !== gameState.targetPlayerId) return;
    emitJtPickCard({ roomId: room.roomId, fromPlayerId, cardIndex });
  };

  // ---------------------------------------------------------------------------
  // Pair-discard handler for own hand
  // ---------------------------------------------------------------------------

  const handleOwnCardClick = (index: number) => {
    if (!room) return;

    if (selectedForDiscard === null) {
      setSelectedForDiscard(index);
      return;
    }

    if (selectedForDiscard === index) {
      setSelectedForDiscard(null);
      return;
    }

    const cardA = hand[selectedForDiscard];
    const cardB = hand[index];

    if (getRank(cardA) === getRank(cardB)) {
      emitJtDiscardPair({ roomId: room.roomId, cards: [cardA, cardB] });
      setSelectedForDiscard(null);
    } else {
      setSelectedForDiscard(index);
    }
  };

  // ---------------------------------------------------------------------------
  // Drag-rearrange handlers for own hand
  // ---------------------------------------------------------------------------

  const onDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const onDrop = (dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;
    dragIndexRef.current = null;

    const newHand = [...hand];
    const [dragged] = newHand.splice(dragIndex, 1);
    newHand.splice(dropIndex, 0, dragged);

    const remaining = hand.map((c, i) => ({ c, i }));
    const usedSet = new Set<number>();
    const cardOrder = newHand.map((card) => {
      const match = remaining.find(({ c, i }) => c === card && !usedSet.has(i));
      if (!match) return 0;
      usedSet.add(match.i);
      return match.i;
    });

    setHand(newHand);
    setSelectedForDiscard(null);
    if (room) emitJtReorderHand({ roomId: room.roomId, cardOrder });
  };

  const canSelfReorder = isSelfActive && !(isSelfTarget && gameState.pickWindowActive);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">

        {/* Turn indicator */}
        <div className="text-center bg-surface border border-border rounded-xl px-4 py-3">
          {isSelfPicker && !gameState.targetPlayerId ? (
            <p className="text-sm font-semibold text-primary">
              Your turn — select a player to pick from ({pickCountdown}s)
            </p>
          ) : isSelfPicker && gameState.targetPlayerId ? (
            <p className="text-sm font-semibold text-primary">
              Pick a card from <span className="font-bold">{targetName}</span> — {pickCountdown}s left
            </p>
          ) : isSelfTarget && gameState.pickWindowActive ? (
            <p className="text-sm font-semibold text-warning">
              <span className="font-bold">{currentPickerName}</span> is targeting you — {pickCountdown}s
            </p>
          ) : isSelfWinner ? (
            <p className="text-sm text-success font-semibold">You won! Spectating...</p>
          ) : (
            <p className="text-sm text-muted">
              {targetName
                ? `${currentPickerName} picking from ${targetName}${gameState.pickWindowActive ? ` (${pickCountdown}s)` : ""}`
                : `${currentPickerName}'s turn`}
            </p>
          )}
        </div>

        {/* Error notification */}
        {gameNotification && (
          <p className="text-center text-sm text-danger font-medium">{gameNotification}</p>
        )}

        {/* Winners list */}
        {gameState.winners.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("playing.winners_label")}:
            </span>
            {gameState.winners.map((id) => {
              const p = room.players.find((rp) => rp.id === id);
              return (
                <span key={id} className="text-xs font-semibold text-primary">
                  {p?.username ?? id}{id === selfId ? " (you)" : ""}
                </span>
              );
            })}
          </div>
        )}

        {/* Other players */}
        <div className="flex flex-col gap-4">
          {room.players
            .filter((p) => p.id !== selfId)
            .map((p) => {
              const isActive = gameState.activePlayers.includes(p.id);
              const isThisTarget = p.id === gameState.targetPlayerId;
              const handCount = gameState.handSizes[p.id] ?? 0;
              const picksFromP = selfId ? (gameState.pickCounts[selfId]?.[p.id] ?? 0) : 0;
              const constraintBlocked = constraintActive && picksFromP >= MAX_PICKS_CONSTRAINT;

              const canSelectAsTarget =
                isSelfPicker &&
                isActive &&
                handCount > 0 &&
                gameState.targetPlayerId === null &&
                !constraintBlocked &&
                gameState.pickWindowActive;

              const canPickCards = isSelfPicker && isThisTarget && gameState.pickWindowActive;

              let borderClass = "border-border";
              if (isThisTarget) borderClass = "border-warning";
              if (canSelectAsTarget) borderClass = "border-primary/50";

              return (
                <div
                  key={p.id}
                  className={[
                    "flex flex-col gap-2 bg-surface border rounded-xl p-4 transition-all",
                    borderClass,
                    canSelectAsTarget ? "cursor-pointer hover:bg-surface/80" : "",
                  ].join(" ")}
                  onClick={canSelectAsTarget ? () => handleSelectTarget(p.id) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.username}</span>
                      {isThisTarget && (
                        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
                          Target
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <span className="text-xs text-success font-medium">Won</span>
                      )}
                      {constraintBlocked && isActive && (
                        <span className="text-xs text-danger">Max picks reached</span>
                      )}
                      {constraintActive && isActive && !constraintBlocked && selfId && (
                        <span className="text-xs text-muted">
                          {picksFromP}/{MAX_PICKS_CONSTRAINT} picks
                        </span>
                      )}
                      {canSelectAsTarget && (
                        <span className="text-xs text-primary font-medium">Click to target</span>
                      )}
                    </div>
                  </div>

                  {/* Face-down cards */}
                  {handCount === 0 ? (
                    <p className="text-xs text-muted">{t("playing.hand_empty")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: handCount }, (_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePickCard(p.id, i);
                          }}
                          disabled={!canPickCards}
                          className={[
                            "w-10 h-14 rounded-lg border-2 text-xl transition-all",
                            "flex items-center justify-center",
                            canPickCards
                              ? "border-primary bg-primary/20 hover:bg-primary/40 hover:scale-105 cursor-pointer"
                              : isThisTarget
                              ? "border-warning/60 bg-warning/10 cursor-not-allowed"
                              : "border-border bg-surface opacity-50 cursor-not-allowed",
                          ].join(" ")}
                          title={canPickCards ? `Pick this card from ${p.username}` : ""}
                        >
                          🂠
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Own hand */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("playing.your_hand")} ({hand.length})
            </span>
            {selectedForDiscard !== null && (
              <span className="text-xs text-primary font-medium">Select matching rank to discard</span>
            )}
            {canSelfReorder && hand.length > 1 && selectedForDiscard === null && (
              <span className="text-xs text-muted italic">Drag to rearrange · tap pair to discard</span>
            )}
            {isSelfTarget && gameState.pickWindowActive && (
              <span className="text-xs text-danger font-medium">Rearranging locked</span>
            )}
          </div>

          {hand.length === 0 ? (
            <p className="text-sm text-success font-semibold">
              {isSelfWinner ? "You won! Spectating..." : "No cards remaining"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hand.map((card, i) => {
                const red = isRed(card);
                const isSelected = selectedForDiscard === i;
                return (
                  <div
                    key={i}
                    draggable={canSelfReorder}
                    onDragStart={() => canSelfReorder && onDragStart(i)}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={() => canSelfReorder && onDrop(i)}
                    onClick={() => handleOwnCardClick(i)}
                    className={[
                      "px-3 py-2 rounded-lg border text-sm font-semibold font-mono select-none transition-all",
                      red ? "text-red-500" : "text-foreground",
                      isSelected
                        ? "border-primary ring-2 ring-primary bg-primary/10 scale-105 cursor-pointer"
                        : "border-border bg-surface hover:border-primary/60 cursor-pointer",
                      canSelfReorder ? "cursor-grab active:cursor-grabbing" : "",
                    ].join(" ")}
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
