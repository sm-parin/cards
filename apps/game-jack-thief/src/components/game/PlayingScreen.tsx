"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { isRed } from "@/utils/cardUtils";
import { emitJtPickCard, emitJtSelectTarget, emitJtReorderHand } from "@/utils/socketEmitter";

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

  const bufferCountdown = useCountdown(gameState?.bufferActive ?? false, 10);
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
  // Drag-rearrange handlers for own hand
  // ---------------------------------------------------------------------------

  const onDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const onDrop = (dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;
    dragIndexRef.current = null;

    // Build new hand by splicing
    const newHand = [...hand];
    const [dragged] = newHand.splice(dragIndex, 1);
    newHand.splice(dropIndex, 0, dragged);

    // Build permutation: cardOrder[newPos] = oldIndex
    // Track used old-indices to handle duplicate card names correctly
    const remaining = hand.map((c, i) => ({ c, i }));
    const usedSet = new Set<number>();
    const cardOrder = newHand.map((card) => {
      const match = remaining.find(({ c, i }) => c === card && !usedSet.has(i));
      if (!match) return 0;
      usedSet.add(match.i);
      return match.i;
    });

    setHand(newHand);
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
            <p className="text-sm font-semibold text-primary">Your turn — select a player to pick from</p>
          ) : isSelfPicker && gameState.bufferActive ? (
            <p className="text-sm font-semibold text-warning">
              Picking from <span className="font-bold">{targetName}</span> — buffer {bufferCountdown}s
            </p>
          ) : isSelfPicker && gameState.pickWindowActive ? (
            <p className="text-sm font-semibold text-primary">
              Pick a card from <span className="font-bold">{targetName}</span> — {pickCountdown}s left
            </p>
          ) : isSelfTarget && gameState.bufferActive ? (
            <p className="text-sm font-semibold text-warning">
              <span className="font-bold">{currentPickerName}</span> is targeting you — {bufferCountdown}s before pick
            </p>
          ) : isSelfTarget && gameState.pickWindowActive ? (
            <p className="text-sm font-semibold text-danger">
              <span className="font-bold">{currentPickerName}</span> is picking from you — {pickCountdown}s
            </p>
          ) : isSelfWinner ? (
            <p className="text-sm text-success font-semibold">You won! Spectating...</p>
          ) : (
            <p className="text-sm text-muted">
              {targetName
                ? `${currentPickerName} picking from ${targetName}${gameState.bufferActive ? ` (${bufferCountdown}s)` : gameState.pickWindowActive ? ` (${pickCountdown}s)` : ""}`
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

              // Can the self picker select this player as target?
              const canSelectAsTarget =
                isSelfPicker &&
                isActive &&
                handCount > 0 &&
                gameState.targetPlayerId === null &&
                !constraintBlocked;

              // Can the self picker click individual cards (pick window open, this is the target)?
              const canPickCards = isSelfPicker && isThisTarget && gameState.pickWindowActive;

              // Border styling
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
                              : isThisTarget && gameState.bufferActive
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
            {canSelfReorder && hand.length > 1 && (
              <span className="text-xs text-muted italic">Drag to rearrange</span>
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
              {hand.map((card, i) => (
                <div
                  key={i}
                  draggable={canSelfReorder}
                  onDragStart={() => canSelfReorder && onDragStart(i)}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => canSelfReorder && onDrop(i)}
                  className={[
                    "px-3 py-2 rounded-lg border border-border bg-surface",
                    "text-sm font-semibold font-mono select-none",
                    isRed(card) ? "text-red-500" : "text-foreground",
                    canSelfReorder ? "cursor-grab active:cursor-grabbing hover:border-primary/50" : "",
                  ].join(" ")}
                >
                  {card}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
