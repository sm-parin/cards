"use client";

/**
 * GameInfoPanel — bottom-left slot content.
 *
 * Shows: phase label, whose turn (or "Your Turn"), master suit,
 * bid target, partner status, and the turn timer.
 */

import { useGameStore } from "@/store/gameStore";
import TurnTimer from "@/components/game/TurnTimer";

const PHASE_LABEL: Record<string, string> = {
  bidding:            "Bidding",
  "partner-selection": "Select Partner",
  playing:            "Playing",
};

const SUIT_COLOR: Record<string, string> = {
  "♥": "#ef4444",
  "♦": "#ef4444",
  "♠": "#ffffff",
  "♣": "#ffffff",
};

export default function GameInfoPanel() {
  const room           = useGameStore((s) => s.room);
  const gameState      = useGameStore((s) => s.gameState);
  const player         = useGameStore((s) => s.player);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);

  if (!room || !gameState) return null;

  const isMyTurn        = currentPlayerId !== null && currentPlayerId === player?.id;
  const currentPlayerName = currentPlayerId
    ? (room.players.find((p) => p.id === currentPlayerId)?.username ?? "...")
    : null;

  const masterSuit = gameState.masterSuit;
  const bidAmount  = gameState.bidding?.currentBid ?? null;
  const bidder     = gameState.bidding?.highestBidder
    ? (room.players.find((p) => p.id === gameState.bidding.highestBidder)?.username ?? "...")
    : null;

  const partnerRevealed = gameState.partner?.revealed ?? false;
  const partnerCards    = gameState.partner?.selectedCards ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Phase */}
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color:         "#6b7280",
      }}>
        {PHASE_LABEL[gameState.phase] ?? gameState.phase}
      </span>

      {/* Turn indicator */}
      {currentPlayerName && (
        <span style={{
          fontSize:   13,
          fontWeight: 600,
          color:      isMyTurn ? "#16a34a" : "#d1d5db",
        }}>
          {isMyTurn ? "Your turn" : `${currentPlayerName}'s turn`}
        </span>
      )}

      {/* Master suit */}
      {masterSuit && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Master</span>
          <span style={{
            fontSize:   20,
            color:      SUIT_COLOR[masterSuit] ?? "#fff",
            lineHeight: 1,
          }}>
            {masterSuit}
          </span>
        </div>
      )}

      {/* Bid target */}
      {bidAmount !== null && bidAmount > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Bid target</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#e8c84a" }}>
            {bidAmount}pts
            {bidder && (
              <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>
                ({bidder})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Partner cards */}
      {partnerCards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {partnerRevealed ? "Partners revealed" : "Partner cards"}
          </span>
          <span style={{ fontSize: 13, color: "#d1d5db" }}>
            {partnerCards.join(", ")}
          </span>
        </div>
      )}

      {/* Turn countdown */}
      <div style={{ marginTop: 4 }}>
        <TurnTimer />
      </div>
    </div>
  );
}
