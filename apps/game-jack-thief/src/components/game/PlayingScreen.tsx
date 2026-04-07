"use client";

import { useRef, useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { getRank } from "@/utils/cardUtils";
import { emitJtPickCard, emitJtSelectTarget, emitJtReorderHand, emitJtDiscardPair } from "@/utils/socketEmitter";
import { GameLayout, PlayerSeat, Card } from "@cards/ui";
import GameHeader from "@/components/shared/GameHeader";

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
  const room            = useGameStore((s) => s.room);
  const gameState       = useGameStore((s) => s.gameState);
  const hand            = useGameStore((s) => s.hand);
  const player          = useGameStore((s) => s.player);
  const gameNotification = useGameStore((s) => s.gameNotification);
  const setHand         = useGameStore((s) => s.setHand);

  const dragIndexRef = useRef<number | null>(null);
  const [selectedForDiscard, setSelectedForDiscard] = useState<number | null>(null);

  const selectPlayerCountdown = useCountdown(gameState?.selectPlayerActive ?? false, 10);
  const bufferCountdown       = useCountdown(gameState?.bufferActive ?? false, 5);
  const pickCountdown         = useCountdown(gameState?.pickWindowActive ?? false, 10);

  if (!room || !gameState) return null;

  const selfId           = player?.id ?? null;
  const isSelfActive     = selfId ? gameState.activePlayers.includes(selfId) : false;
  const isSelfWinner     = selfId ? gameState.winners.includes(selfId) : false;
  const isSelfPicker     = selfId !== null && selfId === gameState.currentPickerId;
  const isSelfTarget     = selfId !== null && selfId === gameState.targetPlayerId;
  const constraintActive = gameState.activePlayers.length > MAX_PICKS_CONSTRAINT;

  const currentPickerName =
    room.players.find((p) => p.id === gameState.currentPickerId)?.username ?? "...";
  const targetName =
    gameState.targetPlayerId
      ? room.players.find((p) => p.id === gameState.targetPlayerId)?.username ?? "..."
      : null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectTarget = (targetPlayerId: string) => {
    if (!room || !isSelfPicker || gameState.targetPlayerId !== null) return;
    if (!gameState.selectPlayerActive) return;
    emitJtSelectTarget({ roomId: room.roomId, targetPlayerId });
  };

  const handlePickCard = (fromPlayerId: string, cardIndex: number) => {
    if (!room || !isSelfPicker || !gameState.pickWindowActive) return;
    if (fromPlayerId !== gameState.targetPlayerId) return;
    emitJtPickCard({ roomId: room.roomId, fromPlayerId, cardIndex });
  };

  const canDiscard = !(isSelfTarget && gameState.pickWindowActive);

  const handleOwnCardClick = (index: number) => {
    if (!room || !canDiscard) return;
    if (selectedForDiscard === null) { setSelectedForDiscard(index); return; }
    if (selectedForDiscard === index) { setSelectedForDiscard(null); return; }
    const cardA = hand[selectedForDiscard];
    const cardB = hand[index];
    if (getRank(cardA) === getRank(cardB)) {
      emitJtDiscardPair({ roomId: room.roomId, cards: [cardA, cardB] });
      setSelectedForDiscard(null);
    } else {
      setSelectedForDiscard(index);
    }
  };

  const onDragStart = (index: number) => { dragIndexRef.current = index; };
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

  // ── Slot: opponents ───────────────────────────────────────────────────────

  const opponentsSlot = (
    <>
      {room.players
        .filter((p) => p.id !== selfId)
        .map((p) => {
          const isActive         = gameState.activePlayers.includes(p.id);
          const isThisTarget     = p.id === gameState.targetPlayerId;
          const handCount        = gameState.handSizes[p.id] ?? 0;
          const picksFromP       = selfId ? (gameState.pickCounts[selfId]?.[p.id] ?? 0) : 0;
          const constraintBlocked = constraintActive && picksFromP >= MAX_PICKS_CONSTRAINT;
          const canSelectAsTarget =
            isSelfPicker && isActive && handCount > 0 &&
            gameState.targetPlayerId === null && gameState.selectPlayerActive && !constraintBlocked;

          return (
            <PlayerSeat
              key={p.id}
              username={p.username}
              cardCount={handCount}
              isMyTurn={isThisTarget}
              isConnected={isActive}
              onClick={canSelectAsTarget ? () => handleSelectTarget(p.id) : undefined}
            />
          );
        })}
    </>
  );

  // ── Slot: table ───────────────────────────────────────────────────────────

  const targetId         = gameState.targetPlayerId;
  const targetHandCount  = targetId ? (gameState.handSizes[targetId] ?? 0) : 0;
  const showTargetCards  = targetId !== null && (gameState.bufferActive || gameState.pickWindowActive);

  const tableSlot = showTargetCards ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#9ca3af' }}>
        {gameState.pickWindowActive && isSelfPicker
          ? `Pick a card from ${targetName} (${pickCountdown}s)`
          : `${currentPickerName} picking from ${targetName}${gameState.bufferActive ? ` — buffer ${bufferCountdown}s` : ''}`}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {Array.from({ length: targetHandCount }, (_, i) => (
          <div
            key={i}
            onClick={(e) => { e.stopPropagation(); handlePickCard(targetId!, i); }}
            style={{ cursor: isSelfPicker && gameState.pickWindowActive ? 'pointer' : 'default' }}
          >
            <Card
              faceDown
              size="md"
              animate
              disabled={!(isSelfPicker && gameState.pickWindowActive)}
              onClick={isSelfPicker && gameState.pickWindowActive ? () => handlePickCard(targetId!, i) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  ) : isSelfPicker && gameState.selectPlayerActive ? (
    <p style={{ fontSize: 14, color: '#9ca3af' }}>
      Select a player above ↑ ({selectPlayerCountdown}s)
    </p>
  ) : (
    <p style={{ fontSize: 14, color: '#6b7280' }}>
      {targetName
        ? `${currentPickerName} → ${targetName}`
        : `${currentPickerName}'s turn`}
    </p>
  );

  // ── Slot: gameInfo ────────────────────────────────────────────────────────

  const gameInfoSlot = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Status */}
      <div style={{ fontSize: 13, fontWeight: 600,
        color: isSelfPicker ? '#16a34a' : isSelfTarget ? '#ef4444' : '#d1d5db' }}>
        {isSelfPicker && gameState.selectPlayerActive
          ? 'Your turn'
          : isSelfPicker && gameState.pickWindowActive
          ? `Picking (${pickCountdown}s)`
          : isSelfTarget && gameState.pickWindowActive
          ? `Being picked (${pickCountdown}s)`
          : isSelfWinner
          ? 'You won!'
          : `${currentPickerName}'s turn`}
      </div>

      {/* Notification */}
      {gameNotification && (
        <p style={{ fontSize: 12, color: '#ef4444' }}>{gameNotification}</p>
      )}

      {/* Winners */}
      {gameState.winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t("playing.winners_label")}
          </span>
          {gameState.winners.map((id) => {
            const p = room.players.find((rp) => rp.id === id);
            return (
              <span key={id} style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                {p?.username ?? id}{id === selfId ? ' (you)' : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Slot: hand ────────────────────────────────────────────────────────────

  const handSlot = hand.length === 0 ? (
    <p style={{ fontSize: 13, color: isSelfWinner ? '#16a34a' : '#6b7280' }}>
      {isSelfWinner ? 'You won! Spectating...' : 'No cards remaining'}
    </p>
  ) : (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
      {hand.map((card, i) => {
        const isSelected = selectedForDiscard === i;
        return (
          <div
            key={i}
            draggable={canSelfReorder}
            onDragStart={() => canSelfReorder && onDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => canSelfReorder && onDrop(i)}
            onClick={() => handleOwnCardClick(i)}
            style={{ cursor: canDiscard ? (canSelfReorder ? 'grab' : 'pointer') : 'not-allowed' }}
          >
            <Card
              card={card}
              size="md"
              selected={isSelected}
              disabled={!canDiscard}
              animate={false}
            />
          </div>
        );
      })}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GameLayout
      header={<GameHeader />}
      opponents={opponentsSlot}
      table={tableSlot}
      gameInfo={gameInfoSlot}
      hand={handSlot}
    />
  );
}
