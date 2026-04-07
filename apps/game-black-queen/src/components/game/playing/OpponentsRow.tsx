"use client";

/**
 * OpponentsRow — single horizontal row of all non-self players.
 * Rendered in the GameLayout opponents slot.
 * Shows: avatar circle (first letter), name, current-turn ring, card played this trick.
 */

import { useGameStore } from "@/store/gameStore";
import { PlayerSeat } from "@cards/ui";

export default function OpponentsRow() {
  const room           = useGameStore((s) => s.room);
  const player         = useGameStore((s) => s.player);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const gameState      = useGameStore((s) => s.gameState);

  if (!room) return null;

  const selfId      = player?.id ?? null;
  const currentStack = gameState?.currentStack ?? [];

  const opponents = room.players.filter((p) => p.id !== selfId);

  return (
    <>
      {opponents.map((p) => {
        const playedCard = currentStack.find((s) => s.playerId === p.id)?.card;
        return (
          <PlayerSeat
            key={p.id}
            username={p.username}
            isMyTurn={p.id === currentPlayerId}
            isConnected={p.isConnected ?? true}
            playedCard={playedCard}
          />
        );
      })}
    </>
  );
}
