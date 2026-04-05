"use client";

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { isRed } from "@/utils/cardUtils";
import { emitJtPickCard } from "@/utils/socketEmitter";

// Max picks from same player when more than 3 active players
const MAX_PICKS_CONSTRAINT = 3;

export default function PlayingScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const hand = useGameStore((s) => s.hand);
  const player = useGameStore((s) => s.player);
  const gameNotification = useGameStore((s) => s.gameNotification);

  if (!room || !gameState) return null;

  const selfId = player?.id ?? null;
  const isSelfActive = selfId ? gameState.activePlayers.includes(selfId) : false;
  const isSelfWinner = selfId ? gameState.winners.includes(selfId) : false;
  const constraintActive = gameState.activePlayers.length > MAX_PICKS_CONSTRAINT;

  const handlePick = (fromPlayerId: string, cardIndex: number) => {
    if (!room || !isSelfActive) return;
    emitJtPickCard({ roomId: room.roomId, fromPlayerId, cardIndex });
  };

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {isSelfWinner ? t("playing.spectating") : t("playing.title")}
          </h1>
          {!isSelfWinner && (
            <p className="text-sm text-muted mt-1">{t("playing.subtitle")}</p>
          )}
        </div>

        {/* Notification */}
        {gameNotification && (
          <p className="text-center text-sm text-danger font-medium">{gameNotification}</p>
        )}

        {/* Winners sidebar */}
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

        {/* Other players — face-down cards */}
        <div className="flex flex-col gap-4">
          {room.players
            .filter((p) => p.id !== selfId)
            .map((p) => {
              const isActive = gameState.activePlayers.includes(p.id);
              const handCount = gameState.handSizes[p.id] ?? 0;
              const picksFromP =
                selfId ? (gameState.pickCounts[selfId]?.[p.id] ?? 0) : 0;
              const constraintBlocked = constraintActive && picksFromP >= MAX_PICKS_CONSTRAINT;
              const canPickFrom = isActive && handCount > 0 && isSelfActive && !constraintBlocked;

              return (
                <div key={p.id} className="flex flex-col gap-2 bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{p.username}</span>
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <span className="text-xs text-success font-medium">Won</span>
                      )}
                      {constraintBlocked && (
                        <span className="text-xs text-danger">Max picks reached</span>
                      )}
                      {constraintActive && isActive && !constraintBlocked && (
                        <span className="text-xs text-muted">
                          {picksFromP}/{MAX_PICKS_CONSTRAINT} picks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Face-down card backs */}
                  {handCount === 0 ? (
                    <p className="text-xs text-muted">{t("playing.hand_empty")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: handCount }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => handlePick(p.id, i)}
                          disabled={!canPickFrom}
                          className={[
                            "w-10 h-14 rounded-lg border-2 text-xl transition-all",
                            "flex items-center justify-center",
                            canPickFrom
                              ? "border-border bg-primary/20 hover:bg-primary/40 hover:scale-105 cursor-pointer"
                              : "border-border bg-surface opacity-50 cursor-not-allowed",
                          ].join(" ")}
                          title={canPickFrom ? `Pick a card from ${p.username}` : ""}
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
          <span className="text-xs text-muted font-medium uppercase tracking-wide">
            {t("playing.your_hand")} ({hand.length})
          </span>
          {hand.length === 0 ? (
            <p className="text-sm text-success font-semibold">
              {isSelfWinner ? "You won! Spectating..." : "No cards remaining"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hand.map((card, i) => (
                <span
                  key={i}
                  className={[
                    "px-3 py-2 rounded-lg border border-border bg-surface",
                    "text-sm font-semibold font-mono",
                    isRed(card) ? "text-red-500" : "text-foreground",
                  ].join(" ")}
                >
                  {card}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
