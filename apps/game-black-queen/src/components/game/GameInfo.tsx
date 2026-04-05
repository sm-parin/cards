"use client";

/**
 * GameInfo — top bar showing the current game phase and whose turn it is.
 *
 * Pure presentational component; receives all data as props.
 * Highlights "Your Turn" when the local player is active.
 */

import { t } from "@/utils/i18n";
import type { GamePhase, Player } from "@/types";

/** Maps GamePhase values to i18n translation keys */
const PHASE_LABEL_KEYS: Record<GamePhase, string> = {
  bidding: "game.phase.bidding",
  "partner-selection": "game.phase.partner_selection",
  playing: "game.phase.playing",
  ended: "game.phase.ended",
};

interface Props {
  phase: GamePhase;
  /** Socket ID of the player whose turn it currently is — null between turns */
  currentPlayerId: string | null;
  /** Socket ID of the local player (self) */
  selfId: string | null;
  /** Full player list — used to resolve the current player's name */
  players: Player[];
}

export default function GameInfo({
  phase,
  currentPlayerId,
  selfId,
  players,
}: Props) {
  const isMyTurn = currentPlayerId !== null && currentPlayerId === selfId;

  /** Resolve display name for the current player */
  const currentPlayerName =
    currentPlayerId !== null
      ? (players.find((p) => p.id === currentPlayerId)?.username ?? currentPlayerId)
      : null;

  return (
    <div className="flex items-center justify-between w-full px-4 py-3 border-b border-border bg-surface">
      {/* Game phase label */}
      <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
        {t(PHASE_LABEL_KEYS[phase])}
      </span>

      {/* Turn indicator */}
      {currentPlayerId !== null && (
        <span
          className={[
            "text-sm font-medium px-3 py-1 rounded-full",
            isMyTurn
              ? "bg-primary text-white"
              : "bg-surface border border-border text-muted",
          ].join(" ")}
        >
          {isMyTurn
            ? t("game.your_turn")
            : `${t("game.turn_of")} ${currentPlayerName}`}
        </span>
      )}
    </div>
  );
}
