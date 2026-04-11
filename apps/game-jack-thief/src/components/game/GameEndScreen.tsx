"use client";

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { Button } from "@cards/ui";

export default function GameEndScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const player = useGameStore((s) => s.player);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!gameState) return null;

  const selfId = player?.id ?? null;
  const { loser, winners /* COIN SYSTEM DISABLED, coinDeltas */ } = gameState;

  const getUsername = (id: string) =>
    room?.players.find((p) => p.id === id)?.username ?? id;

  const handleExit = () => {
    resetGame();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="flex flex-col gap-8 w-full max-w-md">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">{t("end.title")}</h1>
        </div>

        {/* Loser */}
        {loser && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("end.loser_label")}
            </span>
            <div
              className={[
                "flex items-center justify-between px-4 py-3 rounded-xl border",
                loser === selfId
                  ? "border-danger bg-danger/10"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🃏</span>
                <span className="font-semibold text-foreground">
                  {getUsername(loser)}
                  {loser === selfId && (
                    <span className="ml-1 text-sm text-muted">{t("end.you")}</span>
                  )}
                </span>
              </div>
              {/* COIN SYSTEM DISABLED
              <span className="text-danger font-bold font-mono">
                {coinDeltas?.[loser] !== undefined
                  ? `${coinDeltas[loser] > 0 ? "+" : ""}${coinDeltas[loser]}`
                  : "-200"}
              </span>
              */}
            </div>
          </div>
        )}

        {/* Winners */}
        {winners.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("end.winners_label")}
            </span>
            <ul className="flex flex-col gap-2">
              {winners.map((id, rank) => (
                <li
                  key={id}
                  className={[
                    "flex items-center justify-between px-4 py-3 rounded-xl border",
                    id === selfId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted font-mono w-5 text-center">
                      #{rank + 1}
                    </span>
                    <span className="font-semibold text-foreground">
                      {getUsername(id)}
                      {id === selfId && (
                        <span className="ml-1 text-sm text-muted">{t("end.you")}</span>
                      )}
                    </span>
                  </div>
                  {/* COIN SYSTEM DISABLED
                  <span className="text-success font-bold font-mono">
                    {coinDeltas?.[id] !== undefined
                      ? `+${coinDeltas[id]}`
                      : "+100"}
                  </span>
                  */}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="primary" fullWidth onClick={handleExit}>
          {t("end.exit")}
        </Button>
      </div>
    </main>
  );
}
