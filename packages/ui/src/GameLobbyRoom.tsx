'use client';

import type { RoomPlayer } from '@cards/types';
import { colors, radii, typography } from '@cards/theme';
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
        background: colors.bgPrimary,
        padding: '0 16px',
        fontFamily: typography.fontSans,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2
            style={{
              fontSize: typography.sizeXxl,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            {titleLabel}
          </h2>
          <p style={{ fontSize: typography.sizeSm, color: colors.textSecondary, margin: 0 }}>
            {roomIdLabel}: {room.roomId}
          </p>
          {showPasskey && (
            <p
              style={{
                fontSize: typography.sizeSm,
                fontFamily: typography.fontMono,
                fontWeight: 600,
                color: colors.accent,
                letterSpacing: '0.15em',
                margin: 0,
              }}
            >
              {passkeyLabel}: {passkey}
            </p>
          )}
        </div>

        {/* ── Player count ─────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: typography.sizeLg,
            fontWeight: 600,
            color: colors.textPrimary,
            margin: 0,
          }}
        >
          {playerCount}/{room.maxPlayers} {playersLabel}
        </p>

        {/* ── Creator: max players picker ──────────────────────────────── */}
        {isCreator && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                fontSize: typography.sizeXs,
                color: colors.textSecondary,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
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
                      width: '36px',
                      height: '36px',
                      borderRadius: radii.lg,
                      border: `1px solid ${isSelected ? colors.accent : colors.bgBorder}`,
                      background: isSelected ? colors.accent : colors.bgPrimary,
                      color: isSelected ? '#000000' : colors.textSecondary,
                      fontSize: typography.sizeSm,
                      fontWeight: 600,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.3 : 1,
                      transition: 'background 150ms, border-color 150ms',
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
            <p
              style={{
                fontSize: typography.sizeSm,
                color: colors.textSecondary,
                textAlign: 'center',
                margin: 0,
              }}
            >
              {startGameHintLabel} ({playerCount}/{minPlayersToStart})
            </p>
          )
        ) : (
          <Button variant="secondary" fullWidth onClick={onMatchAgain}>
            {matchAgainLabel}
          </Button>
        )}

        {/* ── Leave ─────────────────────────────────────────────────────── */}
        <Button variant="secondary" fullWidth onClick={onLeave}>
          {leaveRoomLabel}
        </Button>
      </div>
    </main>
  );
}
