'use client';

import type { RoomPlayer } from '@cards/types';
import { Button } from './Button';
import { RoomPlayerList } from './RoomPlayerList';

interface LobbyRoom {
  roomId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  isPrivate: boolean;
}

export interface GameLobbyRoomProps {
  room: LobbyRoom;
  selfId: string | null;
  /** Pre-resolved passkey: room.passkey ?? roomPasskey, or null for public rooms */
  passkey: string | null;
  playerOptions: number[];
  minPlayersToStart: number;

  // Labels – English defaults provided
  titleLabel?: string;
  roomIdLabel?: string;
  passkeyLabel?: string;
  playersLabel?: string;
  maxPlayersLabel?: string;
  startGameLabel?: string;
  startGameHintLabel?: string;
  matchAgainLabel?: string;
  leaveRoomLabel?: string;

  // Actions
  onStart: () => void;
  onLeave: () => void;
  onMatchAgain: () => void;
  onChangeMaxPlayers: (n: number) => void;
}

export function GameLobbyRoom({
  room,
  selfId,
  passkey,
  playerOptions,
  minPlayersToStart,
  titleLabel = 'Waiting for players…',
  roomIdLabel = 'Room',
  passkeyLabel = 'Passkey',
  playersLabel = 'Players',
  maxPlayersLabel = 'Max Players',
  startGameLabel = 'Start Game',
  startGameHintLabel = 'Need more players',
  matchAgainLabel = 'Match Again',
  leaveRoomLabel = 'Leave Room',
  onStart,
  onLeave,
  onMatchAgain,
  onChangeMaxPlayers,
}: GameLobbyRoomProps) {
  const playerCount = room.players.length;
  const isCreator = room.players[0]?.id === selfId;
  const canStart = playerCount >= minPlayersToStart;
  const showPasskey = isCreator && !!passkey;

  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #0a0a0f)',
        padding: '0 16px',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          width: '100%',
          maxWidth: '448px',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-fg, #f4f4fb)', margin: 0 }}>
            {titleLabel}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', margin: 0 }}>
            {roomIdLabel}: <span style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>{room.roomId}</span>
          </p>
          {showPasskey && (
            <p
              style={{
                fontSize: '13px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
                color: 'var(--color-accent, #e8c84a)',
                letterSpacing: '0.18em',
                margin: 0,
              }}
            >
              {passkeyLabel}: {passkey}
            </p>
          )}
        </div>

        {/* ── Player count ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg, #f4f4fb)', margin: 0 }}>
            {playerCount}/{room.maxPlayers} {playersLabel}
          </p>
          <div style={{ width: '80px', height: '4px', background: 'var(--color-surface-raised, #181824)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(playerCount / room.maxPlayers) * 100}%`, background: 'var(--color-success, #4ade80)', borderRadius: '99px', transition: 'width 400ms ease' }} />
          </div>
        </div>

        {/* ── Creator: max players picker ──────────────────────────────── */}
        {isCreator && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-fg-muted, #8888a8)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {maxPlayersLabel}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {playerOptions.map((n) => {
                const isSelected = room.maxPlayers === n;
                const isDisabled = n < playerCount;
                return (
                  <button
                    key={n}
                    onClick={() => onChangeMaxPlayers(n)}
                    disabled={isDisabled}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      border: `1px solid ${isSelected ? 'var(--color-brand, #6366f1)' : 'var(--color-border, #252535)'}`,
                      background: isSelected ? 'var(--color-brand, #6366f1)' : 'var(--color-surface, #111118)',
                      color: isSelected ? '#fff' : 'var(--color-fg-muted, #8888a8)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.3 : 1,
                      transition: 'background 150ms, border-color 150ms, color 150ms',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Player list ──────────────────────────────────────────────── */}
        <RoomPlayerList
          players={room.players}
          currentUserId={selfId ?? ''}
          maxPlayers={room.maxPlayers}
        />

        {/* ── Primary action ───────────────────────────────────────────── */}
        {isCreator ? (
          canStart ? (
            <Button variant="primary" fullWidth onClick={onStart}>
              {startGameLabel}
            </Button>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--color-surface, #111118)',
                border: '1px solid var(--color-border, #252535)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '13px', color: 'var(--color-fg-muted, #8888a8)', margin: 0 }}>
                {startGameHintLabel} ({playerCount}/{minPlayersToStart})
              </p>
            </div>
          )
        ) : (
          <Button variant="secondary" fullWidth onClick={onMatchAgain}>
            {matchAgainLabel}
          </Button>
        )}

        {/* ── Leave ─────────────────────────────────────────────────────── */}
        <Button variant="ghost" fullWidth onClick={onLeave}>
          {leaveRoomLabel}
        </Button>
      </div>
    </main>
  );
}
