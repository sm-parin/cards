"use client";

/**
 * PlayerList — displays all players currently in the room.
 *
 * Pure presentational component; receives data as props.
 * Highlights the local player (self) with a visual indicator.
 */

import { t } from "@/utils/i18n";
import type { Player } from "@/types";

interface Props {
  players: Player[];
  /** socket.id of the local player — used to mark self */
  selfId: string | null;
}

export default function PlayerList({ players, selfId }: Props) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        {t("lobby.player_list_title")}
      </h3>

      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const isSelf = player.id === selfId;
          return (
            <li
              key={player.id}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "border text-foreground text-sm",
                isSelf
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              {/* Connected indicator */}
              <span
                className={[
                  "w-2 h-2 rounded-full flex-shrink-0",
                  player.isConnected ? "bg-success" : "bg-muted",
                ].join(" ")}
              />
              <span>{player.username}</span>
              {isSelf && (
                <span className="ml-auto text-xs text-muted">(you)</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
