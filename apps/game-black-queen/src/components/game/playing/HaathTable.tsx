"use client";

/**
 * HaathTable — center table showing cards played in the current round.
 *
 * Pure presentational component; no store access — receives data as props.
 */

import { t } from "@/utils/i18n";
import Card from "@/components/game/playing/Card";
import type { StackCard, Player } from "@/types";

interface Props {
  currentHaath: StackCard[];
  players: Player[];
  /** Socket ID of the local player — used to label own card */
  selfId: string | null;
}

/** Resolve a player's display name from the player list */
function resolveName(players: Player[], playerId: string, selfId: string | null): string {
  if (playerId === selfId) return t("playing.your_play");
  return players.find((p) => p.id === playerId)?.username ?? playerId;
}

export default function HaathTable({
  currentHaath,
  players,
  selfId,
}: Props) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider text-center">
          {t("playing.haath_title")}
        </h3>

        {currentHaath.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            {t("playing.haath_empty")}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {currentHaath.map(({ playerId, card }) => (
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
