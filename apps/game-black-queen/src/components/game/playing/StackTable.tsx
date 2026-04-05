"use client";

/**
 * StackTable — center table showing cards played in the current round.
 *
 * Pure presentational component; no store access — receives data as props.
 */

import { t } from "@/utils/i18n";
import Card from "@/components/game/playing/Card";
import type { StackCard, Player } from "@/types";

interface Props {
  currentStack: StackCard[];
  players: Player[];
  /** Socket ID of the local player — used to label own card */
  selfId: string | null;
}

/** Resolve a player's display name from the player list */
function resolveName(players: Player[], playerId: string, selfId: string | null): string {
  if (playerId === selfId) return t("playing.your_play");
  return players.find((p) => p.id === playerId)?.username ?? playerId;
}

export default function StackTable({
  currentStack,
  players,
  selfId,
}: Props) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider text-center">
          {t("playing.stack_title")}
        </h3>

        {currentStack.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            {t("playing.stack_empty")}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {currentStack.map(({ playerId, card }) => (
              <div key={playerId} className="flex flex-col items-center gap-1">
                <Card card={card} />
                <span className="text-xs text-muted">
                  {resolveName(players, playerId, selfId)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
