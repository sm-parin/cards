"use client";

/**
 * GameScreen — main game view, shown once a game has started.
 *
 * Delegates to GameEndScreen when phase === "ended".
 *
 * Active layout (top → bottom):
 *   1. GameInfo            — phase label + turn indicator
 *   2. TurnTimer           — countdown bar (visible on player's turn only)
 *   3. PartnerRevealBanner — transient: fades in when partner is revealed
 *   4. Center area         — phase-dependent:
 *        • bidding           → BiddingPanel
 *        • partner-selection → PartnerSelection
 *        • playing           → StackTable + StackFlash
 *   5. Footer              — player's hand
 *        • bidding / partner-selection → static PlayerHand
 *        • playing                     → interactive Hand
 *
 * All state is read from the Zustand store; no props needed.
 */

import { useGameStore } from "@/store/gameStore";
import GameInfo from "@/components/game/GameInfo";
import PlayerHand from "@/components/game/PlayerHand";
import TurnTimer from "@/components/game/TurnTimer";
import GameEndScreen from "@/components/game/GameEndScreen";
import BiddingPanel from "@/components/game/bidding/BiddingPanel";
import PartnerSelection from "@/components/game/partner/PartnerSelection";
import StackTable from "@/components/game/playing/StackTable";
import StackFlash from "@/components/game/playing/StackFlash";
import PartnerRevealBanner from "@/components/game/playing/PartnerRevealBanner";
import Hand from "@/components/game/playing/Hand";

export default function GameScreen() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const player = useGameStore((s) => s.player);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const gameNotification = useGameStore((s) => s.gameNotification);

  // AppView guards this — should never be null here
  if (!room || !gameState) return null;

  // ── Game over: delegate to full-screen result view ───────────────────────
  if (gameState.phase === "ended") {
    return <GameEndScreen />;
  }

  const isPlaying = gameState.phase === "playing";
  const isMyTurn = currentPlayerId !== null && currentPlayerId === player?.id;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── 1. Phase + turn indicator ─────────────────────────────────────── */}
      <GameInfo
        phase={gameState.phase}
        currentPlayerId={currentPlayerId}
        selfId={player?.id ?? null}
        players={room.players}
      />

      {/* ── 2. Turn timer (self-contained — shows only on player's turn) ───── */}
      <TurnTimer />

      {/* ── 3. Partner reveal notification (self-contained, transient) ─────── */}
      <PartnerRevealBanner />

      {/* ── 3b. Game error notification (e.g. suit-follow rule violation) ──── */}
      {gameNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-amber-500 text-black text-sm font-semibold shadow-lg pointer-events-none">
          {gameNotification}
        </div>
      )}

      {/* ── 4. Phase-dependent center content ────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center py-6">
        {gameState.phase === "bidding" && <BiddingPanel />}

        {gameState.phase === "partner-selection" && <PartnerSelection />}

        {isPlaying && (
          <StackTable
            currentStack={gameState.currentStack}
            players={room.players}
            selfId={player?.id ?? null}
          />
        )}
      </main>

      {/* ── 5. Stack flash (between table and hand, playing only) ──────────── */}
      {isPlaying && <StackFlash />}

      {/* ── 6. Player's hand ──────────────────────────────────────────────── */}
      <footer className="pb-6 pt-4 border-t border-border bg-surface">
        {isPlaying ? (
          <Hand
            cards={player?.hand ?? []}
            currentSuit={gameState.currentSuit}
            isMyTurn={isMyTurn}
            roomId={room.roomId}
          />
        ) : (
          <PlayerHand cards={player?.hand ?? []} />
        )}
      </footer>
    </div>
  );
}
