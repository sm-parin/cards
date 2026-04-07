"use client";

/**
 * GameScreen — main game view using the GameLayout shell.
 *
 * Slot mapping:
 *   header    → GameHeader
 *   opponents → OpponentsRow (all non-self players)
 *   table     → phase-dependent: BiddingPanel / PartnerSelection / StackTable
 *   gameInfo  → GameInfoPanel (phase, bid, suit, partner + turn timer)
 *   hand      → Hand (playing) or PlayerHand (other phases)
 *
 * Fixed overlays (not in layout flow):
 *   PartnerRevealBanner, StackFlash, gameNotification toast
 */

import { GameLayout } from "@cards/ui";
import { useGameStore } from "@/store/gameStore";
import GameHeader from "@/components/shared/GameHeader";
import GameEndScreen from "@/components/game/GameEndScreen";
import PlayerHand from "@/components/game/PlayerHand";
import BiddingPanel from "@/components/game/bidding/BiddingPanel";
import PartnerSelection from "@/components/game/partner/PartnerSelection";
import StackTable from "@/components/game/playing/StackTable";
import StackFlash from "@/components/game/playing/StackFlash";
import PartnerRevealBanner from "@/components/game/playing/PartnerRevealBanner";
import Hand from "@/components/game/playing/Hand";
import OpponentsRow from "@/components/game/playing/OpponentsRow";
import GameInfoPanel from "@/components/game/playing/GameInfoPanel";

export default function GameScreen() {
  const room            = useGameStore((s) => s.room);
  const gameState       = useGameStore((s) => s.gameState);
  const player          = useGameStore((s) => s.player);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const gameNotification = useGameStore((s) => s.gameNotification);

  if (!room || !gameState) return null;

  if (gameState.phase === "ended") return <GameEndScreen />;

  const isPlaying = gameState.phase === "playing";
  const isMyTurn  = currentPlayerId !== null && currentPlayerId === player?.id;

  return (
    <>
      <GameLayout
        header={<GameHeader />}
        opponents={<OpponentsRow />}
        table={
          gameState.phase === "bidding" ? (
            <BiddingPanel />
          ) : gameState.phase === "partner-selection" ? (
            <PartnerSelection />
          ) : (
            <StackTable
              currentStack={gameState.currentStack}
              players={room.players}
              selfId={player?.id ?? null}
            />
          )
        }
        gameInfo={<GameInfoPanel />}
        hand={
          isPlaying ? (
            <Hand
              cards={player?.hand ?? []}
              currentSuit={gameState.currentSuit}
              isMyTurn={isMyTurn}
              roomId={room.roomId}
            />
          ) : (
            <PlayerHand cards={player?.hand ?? []} />
          )
        }
      />

      {/* Fixed overlays — outside layout flow */}
      <PartnerRevealBanner />
      {isPlaying && <StackFlash />}
      {gameNotification && (
        <div
          style={{
            position:    'fixed',
            top:         16,
            left:        '50%',
            transform:   'translateX(-50%)',
            zIndex:      50,
            padding:     '10px 20px',
            borderRadius: 12,
            background:  '#f59e0b',
            color:       '#000',
            fontSize:    14,
            fontWeight:  600,
            boxShadow:   '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          {gameNotification}
        </div>
      )}
    </>
  );
}
