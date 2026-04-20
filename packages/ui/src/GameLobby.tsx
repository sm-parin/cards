'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@cards/hooks';
import type { LobbyEntry } from '@cards/types';
import { Button } from './Button';

export type { LobbyEntry };

export interface GameLobbyProps {
  // Game config
  minPlayers: number;
  maxPlayers: number;
  title: string;
  subtitle: string;

  // Data
  lobbies: LobbyEntry[];
  pending?: boolean;

  // Labels (optional â€” fallback text provided)
  matchmakeLabel?: string;
  createPublicLabel?: string;
  createPrivateLabel?: string;
  loadingLabel?: string;
  refreshLabel?: string;

  // Actions
  onMatchmake: () => void;
  onCreatePublicLobby: (max: number) => void;
  onCreatePrivateRoom: (max: number) => void;
  onJoinPublicLobby: (roomId: string) => void;
  onJoinPrivateRoom: (passkey: string) => void;
  onRefresh: () => void;
}

export function GameLobby({
  minPlayers,
  maxPlayers: maxPlayersConfig,
  title,
  subtitle,
  lobbies,
  pending = false,
  matchmakeLabel = 'Matchmake',
  createPublicLabel = 'Create Public Lobby',
  createPrivateLabel = 'Create Private Room',
  loadingLabel = 'Loading...',
  refreshLabel = 'Refresh',
  onMatchmake,
  onCreatePublicLobby,
  onCreatePrivateRoom,
  onJoinPublicLobby,
  onJoinPrivateRoom,
  onRefresh,
}: GameLobbyProps) {
  const [playerMax, setPlayerMax] = useState(minPlayers);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublic, setFilterPublic] = useState(true);
  const [filterPrivate, setFilterPrivate] = useState(true);
  const [filterByPlayers, setFilterByPlayers] = useState(false);
  const [sortOrder, setSortOrder] = useState<'fill-desc' | 'fill-asc'>('fill-desc');

  const [verifyingRoomId, setVerifyingRoomId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Keep playerMax in bounds if config changes
  useEffect(() => {
    setPlayerMax((v) => Math.max(minPlayers, Math.min(maxPlayersConfig, v)));
  }, [minPlayers, maxPlayersConfig]);

  const filteredLobbies = lobbies
    .filter((l) => {
      if (!filterPublic && !l.isPrivate) return false;
      if (!filterPrivate && l.isPrivate) return false;
      if (filterByPlayers && l.maxPlayers !== playerMax) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const name = `${l.creatorName}'s ${l.isPrivate ? 'room' : 'lobby'}`.toLowerCase();
        if (!name.includes(q) && !l.creatorName.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const fillA = a.playerCount / a.maxPlayers;
      const fillB = b.playerCount / b.maxPlayers;
      return sortOrder === 'fill-desc' ? fillB - fillA : fillA - fillB;
    });

  const handleVerifyClick = (roomId: string) => {
    setVerifyingRoomId(roomId);
    setVerifyCode('');
  };

  const handleVerifyClose = () => {
    setVerifyingRoomId(null);
    setVerifyCode('');
  };

  const handleJoinVerified = () => {
    if (verifyCode.length !== 6 || pending) return;
    onJoinPrivateRoom(verifyCode);
    handleVerifyClose();
  };

  // â”€â”€ Shared style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inputStyle = {
    width: '100%',
    borderRadius: '10px',
    border: '1px solid var(--color-border, #252535)',
    background: 'var(--color-bg, #09090e)',
    color: 'var(--color-fg, #f4f4fb)',
    padding: '8px 36px 8px 14px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    transition: 'border-color 150ms',
  };

  const chipBase = {
    flexShrink: 0 as const,
    fontSize: '12px',
    padding: '4px 12px',
    borderRadius: '99px',
    border: '1px solid var(--color-border, #252535)',
    fontWeight: 500 as const,
    cursor: 'pointer' as const,
    transition: 'background 150ms, border-color 150ms, color 150ms',
  };

  const chipActive = {
    ...chipBase,
    background: 'var(--color-surface-raised, #181824)',
    color: 'var(--color-fg, #f4f4fb)',
    borderColor: 'var(--color-fg-subtle, #3a3a55)',
  };

  const chipInactive = {
    ...chipBase,
    background: 'transparent',
    color: 'var(--color-fg-muted, #8888a8)',
  };

  return (
    <main
      style={{
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--color-bg, #09090e)',
        height: 'calc(100dvh - 57px)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* â”€â”€ Left panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside
        style={{
          width: '288px',
          flexShrink: 0,
          borderRight: '1px solid var(--color-border, #252535)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          overflowY: 'auto',
        }}
      >
        {/* Game title */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-fg, #f4f4fb)', margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', marginTop: '4px', marginBottom: 0 }}>
            {subtitle}
          </p>
        </div>

        <Button variant="primary" fullWidth onClick={onMatchmake} disabled={pending}>
          {pending ? loadingLabel : matchmakeLabel}
        </Button>

        <hr style={{ border: 'none', borderTop: `1px solid var(--color-border, #252535)`, margin: 0 }} />

        {/* Player count stepper + slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-fg-muted, #8888a8)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Max Players
          </span>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <button
              onClick={() => setPlayerMax((v) => Math.max(minPlayers, v - 1))}
              disabled={playerMax <= minPlayers}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: `1px solid var(--color-border, #252535)`,
                background: 'var(--color-bg, #09090e)',
                color: 'var(--color-fg, #f4f4fb)',
                fontWeight: 700,
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: playerMax <= minPlayers ? 'not-allowed' : 'pointer',
                opacity: playerMax <= minPlayers ? 0.4 : 1,
                flexShrink: 0,
              }}
            >âˆ’</button>
            <span
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: 'var(--color-fg, #f4f4fb)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {playerMax}
            </span>
            <button
              onClick={() => setPlayerMax((v) => Math.min(maxPlayersConfig, v + 1))}
              disabled={playerMax >= maxPlayersConfig}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: `1px solid var(--color-border, #252535)`,
                background: 'var(--color-bg, #09090e)',
                color: 'var(--color-fg, #f4f4fb)',
                fontWeight: 700,
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: playerMax >= maxPlayersConfig ? 'not-allowed' : 'pointer',
                opacity: playerMax >= maxPlayersConfig ? 0.4 : 1,
                flexShrink: 0,
              }}
            >+</button>
          </div>

          <input
            type="range"
            min={minPlayers}
            max={maxPlayersConfig}
            value={playerMax}
            onChange={(e) => setPlayerMax(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-accent, #e8c84a)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)' }}>
            <span>{minPlayers}</span>
            <span>{maxPlayersConfig}</span>
          </div>
        </div>

        <Button variant="secondary" fullWidth onClick={() => onCreatePublicLobby(playerMax)} disabled={pending}>
          {createPublicLabel}
        </Button>

        <Button variant="secondary" fullWidth onClick={() => onCreatePrivateRoom(playerMax)} disabled={pending}>
          {createPrivateLabel}
        </Button>
      </aside>

      {/* â”€â”€ Right panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Search bar */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid var(--color-border, #252535)` }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by room name or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-fg-muted, #8888a8)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: '12px',
                }}
              >âœ•</button>
            )}
          </div>
        </div>

        {/* Filter + Sort row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderBottom: `1px solid var(--color-border, #252535)`,
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', flexShrink: 0 }}>
            Filters:
          </span>

          <button
            onClick={() => setFilterPrivate((v) => !v)}
            style={filterPrivate ? chipActive : chipInactive}
          >
            Private
          </button>

          <button
            onClick={() => setFilterPublic((v) => !v)}
            style={filterPublic ? chipActive : chipInactive}
          >
            Public
          </button>

          <button
            onClick={() => setFilterByPlayers((v) => !v)}
            style={filterByPlayers ? chipActive : chipInactive}
          >
            {filterByPlayers ? `${playerMax} players` : 'Players'}
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', flexShrink: 0 }}>
            Sort:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'fill-desc' | 'fill-asc')}
            style={{
              flexShrink: 0,
              fontSize: '12px',
              background: 'var(--color-bg, #09090e)',
              color: 'var(--color-fg, #f4f4fb)',
              border: `1px solid var(--color-border, #252535)`,
              borderRadius: '8px',
              padding: '4px 8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="fill-desc">Most Filled</option>
            <option value="fill-asc">Least Filled</option>
          </select>

          <button
            onClick={onRefresh}
            style={{
              flexShrink: 0,
              fontSize: '12px',
              color: 'var(--color-accent, #e8c84a)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {refreshLabel}
          </button>
        </div>

        {/* Lobby table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLobbies.length === 0 ? (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-fg-muted, #8888a8)',
                textAlign: 'center',
                padding: '48px 0',
                margin: 0,
              }}
            >
              No rooms available
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-bg, #09090e)',
                    borderBottom: `1px solid var(--color-border, #252535)`,
                  }}
                >
                  {(['Room', 'Players', 'Action'] as const).map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: 'var(--color-fg-muted, #8888a8)',
                        fontWeight: 500,
                        textAlign: i === 2 ? 'right' : 'left',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLobbies.map((lobby) => {
                  const lobbyName = `${lobby.creatorName}'s ${lobby.isPrivate ? 'room' : 'lobby'}`;
                  const isVerifying = verifyingRoomId === lobby.roomId;
                  const isHovered = hoveredRow === lobby.roomId;

                  return (
                    <tr
                      key={lobby.roomId}
                      onMouseEnter={() => setHoveredRow(lobby.roomId)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: `1px solid var(--color-border, #252535)`,
                        background: isHovered ? 'var(--color-surface, #111118)' : 'transparent',
                        transition: 'background 150ms',
                      }}
                    >
                      <td
                        style={{
                          padding: '12px 16px',
                          color: 'var(--color-fg, #f4f4fb)',
                          fontWeight: 500,
                        }}
                      >
                        {lobbyName}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          color: 'var(--color-fg-muted, #8888a8)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {lobby.playerCount}/{lobby.maxPlayers}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {lobby.isPrivate ? (
                          isVerifying ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={6}
                                  placeholder="000000"
                                  value={verifyCode}
                                  onChange={(e) =>
                                    setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                  }
                                  style={{
                                    width: '112px',
                                    borderRadius: '8px',
                                    border: `1px solid var(--color-border, #252535)`,
                                    background: 'var(--color-bg, #09090e)',
                                    color: 'var(--color-fg, #f4f4fb)',
                                    padding: '4px 24px 4px 8px',
                                    fontSize: '12px',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    letterSpacing: '0.15em',
                                    outline: 'none',
                                    boxSizing: 'border-box' as const,
                                  }}
                                />
                                <button
                                  onClick={handleVerifyClose}
                                  style={{
                                    position: 'absolute',
                                    right: '6px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-fg-muted, #8888a8)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '12px',
                                    lineHeight: 1,
                                  }}
                                >âœ•</button>
                              </div>
                              <button
                                onClick={handleJoinVerified}
                                disabled={verifyCode.length !== 6 || pending}
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--color-accent, #e8c84a)',
                                  fontWeight: 600,
                                  background: 'none',
                                  border: 'none',
                                  cursor: verifyCode.length !== 6 || pending ? 'not-allowed' : 'pointer',
                                  opacity: verifyCode.length !== 6 || pending ? 0.5 : 1,
                                  padding: 0,
                                  textDecoration: 'underline',
                                }}
                              >
                                Join
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVerifyClick(lobby.roomId)}
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-warning, #fbbf24)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              Verify
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => { if (!pending) onJoinPublicLobby(lobby.roomId); }}
                            disabled={pending}
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-accent, #e8c84a)',
                              fontWeight: 600,
                              background: 'none',
                              border: 'none',
                              cursor: pending ? 'not-allowed' : 'pointer',
                              opacity: pending ? 0.5 : 1,
                              padding: 0,
                              textDecoration: 'underline',
                            }}
                          >
                            Join
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
