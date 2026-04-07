"use client";

/**
 * StackTable — cards played in the current trick, shown in the table area.
 *
 * Single horizontal row (no wrap). Each card has the player's name below it.
 * Uses @cards/ui Card for consistent visuals with the hand.
 */

import { t } from "@/utils/i18n";
import { Card } from "@cards/ui";
import type { StackCard, Player } from "@/types";

interface Props {
  currentStack: StackCard[];
  players: Player[];
  selfId: string | null;
}

function resolveName(players: Player[], playerId: string, selfId: string | null): string {
  if (playerId === selfId) return t("playing.your_play");
  return players.find((p) => p.id === playerId)?.username ?? "...";
}

export default function StackTable({ currentStack, players, selfId }: Props) {
  if (currentStack.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        {t("playing.stack_empty")}
      </p>
    );
  }

  return (
    <div style={{
      display:    'flex',
      gap:        12,
      alignItems: 'flex-end',
      overflowX:  'auto',
    }}>
      {currentStack.map(({ playerId, card }) => (
        <div
          key={playerId}
          style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           6,
            flexShrink:    0,
          }}
        >
          <Card card={card} size="md" animate />
          <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {resolveName(players, playerId, selfId)}
          </span>
        </div>
      ))}
    </div>
  );
}
