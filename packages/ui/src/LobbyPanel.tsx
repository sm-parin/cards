'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';
import { AvatarCircle } from './AvatarCircle';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@cards/types';
import type { GameInfo, LobbyEntry } from '@cards/types';

export interface SocketLike {
  connected: boolean;
  connect(): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
}

interface Room {
  roomId: string;
  players: Array<{ id: string; nickname: string }>;
  maxPlayers: number;
  isPrivate: boolean;
  passkey: string | null;
}

type Tab = 'create' | 'join';
type SortOrder = 'oldest' | 'newest' | 'fastest';

export interface LobbyPanelProps {
  gameInfo: GameInfo;
  getSocket: () => SocketLike;
  gameUrl: string;
  token?: string | null;
}

export function LobbyPanel({ gameInfo, getSocket, gameUrl, token }: LobbyPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [playerCount, setPlayerCount] = useState(gameInfo.minPlayers);
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState<'id' | 'passkey' | null>(null);
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPublic, setShowPublic] = useState(true);
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [exactPlayerCount, setExactPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    const navigateToGame = () => {
      const url = new URL(gameUrl);
      if (token) url.searchParams.set('token', token);
      window.location.replace(url.toString());
    };
    const handleRoomJoined = (payload: { room: Room }) => {
      setCreatedRoom(payload.room); setCreatingLobby(false); setActiveTab('create');
    };
    const handleRoomUpdate = (payload: { players: Array<{ id: string; nickname: string }>; maxPlayers?: number }) => {
      setCreatedRoom(prev => prev ? { ...prev, players: payload.players, maxPlayers: payload.maxPlayers ?? prev.maxPlayers } : prev);
    };
    const handleLobbiesList = (payload: { lobbies: LobbyEntry[] }) => {
      setLobbies(payload.lobbies); setLoadingLobbies(false);
    };
    socket.on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
    socket.on(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
    socket.on(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);
    socket.on(gameInfo.gameStartedEvent, navigateToGame);
    return () => {
      socket.off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
      socket.off(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
      socket.off(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);
      socket.off(gameInfo.gameStartedEvent, navigateToGame);
    };
  }, [gameUrl, token, gameInfo.gameStartedEvent, getSocket]);

  const fetchLobbies = useCallback(() => {
    const socket = getSocket(); setLoadingLobbies(true); socket.emit(CLIENT_EVENTS.GET_LOBBIES);
  }, [getSocket]);

  useEffect(() => { if (activeTab === 'join') fetchLobbies(); }, [activeTab, fetchLobbies]);

  const handleCreatePublic = () => { setCreatingLobby(true); getSocket().emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers: playerCount }); };
  const handleCreatePrivate = () => { setCreatingLobby(true); getSocket().emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers: playerCount }); };
  const handleLeaveRoom = () => { if (createdRoom) { getSocket().emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId: createdRoom.roomId }); setCreatedRoom(null); } };
  const handleStartGame = () => { if (createdRoom && createdRoom.players.length === createdRoom.maxPlayers) { getSocket().emit(CLIENT_EVENTS.START_GAME, { roomId: createdRoom.roomId }); } };
  const handleJoinPublicLobby = (roomId: string) => { getSocket().emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId }); };
  const handleQuickMatch = () => { getSocket().emit(CLIENT_EVENTS.PLAY_NOW); };
  const handleCopy = (text: string, type: 'id' | 'passkey') => {
    navigator.clipboard.writeText(text).then(() => { setCopied(type); setTimeout(() => setCopied(null), 1500); });
  };

  const filteredLobbies = lobbies
    .filter(l => {
      if (!showPublic && !l.isPrivate) return false;
      if (!showPrivate && l.isPrivate) return false;
      if (searchQuery && !l.creatorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (exactPlayerCount !== null && l.maxPlayers !== exactPlayerCount) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'fastest') { const dA = a.maxPlayers - a.playerCount, dB = b.maxPlayers - b.playerCount; return dA !== dB ? dA - dB : 0; }
      return sortOrder === 'newest' ? -1 : 1;
    });

  // ── Inline style helpers ──────────────────────────────────────────────────
  const S = {
    container: {
      background: 'var(--color-surface, #111118)',
      border: '1px solid var(--color-border, #252535)',
      borderRadius: '16px',
      overflow: 'hidden',
    } as React.CSSProperties,
    tabBar: {
      display: 'flex',
      padding: '6px',
      gap: '2px',
      background: 'var(--color-bg, #09090e)',
      borderBottom: '1px solid var(--color-border, #252535)',
    } as React.CSSProperties,
    tabBtn: (active: boolean): React.CSSProperties => ({
      flex: 1,
      padding: '7px 0',
      fontSize: '13px',
      fontWeight: 600,
      letterSpacing: '0.01em',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'background 150ms, color 150ms',
      background: active ? 'var(--color-surface, #111118)' : 'transparent',
      color: active ? 'var(--color-fg, #f4f4fb)' : 'var(--color-fg-muted, #8888a8)',
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
    }),
    body: {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    } as React.CSSProperties,
    label: {
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.07em',
      textTransform: 'uppercase' as const,
      color: 'var(--color-fg-muted, #8888a8)',
    },
    countBadge: {
      fontSize: '13px',
      fontWeight: 700,
      tabularNums: true,
      color: 'var(--color-fg, #f4f4fb)',
      background: 'var(--color-surface-raised, #181824)',
      border: '1px solid var(--color-border, #252535)',
      padding: '1px 10px',
      borderRadius: '99px',
    } as React.CSSProperties,
    input: {
      width: '100%',
      background: 'var(--color-bg, #09090e)',
      border: '1px solid var(--color-border, #252535)',
      borderRadius: '10px',
      padding: '8px 12px',
      fontSize: '13px',
      color: 'var(--color-fg, #f4f4fb)',
      outline: 'none',
      boxSizing: 'border-box' as const,
      fontFamily: 'inherit',
      transition: 'border-color 150ms',
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as React.CSSProperties,
    copyBtn: (active: boolean): React.CSSProperties => ({
      fontSize: '11px',
      fontWeight: 500,
      color: active ? 'var(--color-success, #4ade80)' : 'var(--color-fg-muted, #8888a8)',
      background: 'var(--color-surface-raised, #181824)',
      border: '1px solid var(--color-border, #252535)',
      borderRadius: '6px',
      padding: '2px 8px',
      cursor: 'pointer',
      transition: 'color 150ms',
    }),
    typePill: (isPrivate: boolean): React.CSSProperties => ({
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 10px',
      borderRadius: '99px',
      background: isPrivate ? 'rgba(251,146,60,0.12)' : 'rgba(99,102,241,0.12)',
      color: isPrivate ? '#fb923c' : 'var(--color-brand, #6366f1)',
      border: `1px solid ${isPrivate ? 'rgba(251,146,60,0.25)' : 'rgba(99,102,241,0.25)'}`,
    }),
    filterChip: (active: boolean): React.CSSProperties => ({
      fontSize: '12px',
      fontWeight: 500,
      padding: '4px 12px',
      borderRadius: '99px',
      border: '1px solid var(--color-border, #252535)',
      cursor: 'pointer',
      transition: 'all 150ms',
      background: active ? 'var(--color-surface-raised, #181824)' : 'transparent',
      color: active ? 'var(--color-fg, #f4f4fb)' : 'var(--color-fg-muted, #8888a8)',
    }),
    tableHeader: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      gap: '12px',
      padding: '8px 14px',
      background: 'var(--color-bg, #09090e)',
      borderBottom: '1px solid var(--color-border, #252535)',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: 'var(--color-fg-subtle, #3a3a55)',
    },
    tableRow: (idx: number): React.CSSProperties => ({
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      gap: '12px',
      alignItems: 'center',
      padding: '10px 14px',
      fontSize: '13px',
      borderTop: idx !== 0 ? '1px solid var(--color-border, #252535)' : 'none',
      transition: 'background 120ms',
      cursor: 'default',
    }),
  };

  return (
    <div style={S.container}>
      {/* ── Tab bar ── */}
      <div style={S.tabBar}>
        {(['create', 'join'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={S.tabBtn(activeTab === tab)}>
            {tab === 'create' ? 'Create Lobby' : 'Join Lobby'}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {/* ════ CREATE TAB ════ */}
        {activeTab === 'create' && (
          <>
            {!createdRoom ? (
              <>
                {/* Player count slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={S.label}>Players</span>
                    <span style={S.countBadge}>{playerCount}</span>
                  </div>
                  <input
                    type="range"
                    min={gameInfo.minPlayers}
                    max={gameInfo.maxPlayers}
                    value={playerCount}
                    onChange={e => setPlayerCount(Number(e.target.value))}
                    disabled={creatingLobby}
                    style={{ width: '100%', accentColor: 'var(--color-brand, #6366f1)', cursor: creatingLobby ? 'not-allowed' : 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fg-subtle, #3a3a55)' }}>
                    <span>{gameInfo.minPlayers}</span>
                    <span>{gameInfo.maxPlayers}</span>
                  </div>
                </div>

                {/* Create buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Button variant="primary" fullWidth onClick={handleCreatePublic} disabled={creatingLobby} loading={creatingLobby}>
                    Public
                  </Button>
                  <Button variant="secondary" fullWidth onClick={handleCreatePrivate} disabled={creatingLobby} loading={creatingLobby}>
                    Private
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Room info card */}
                <div style={{ background: 'var(--color-bg, #09090e)', border: '1px solid var(--color-border, #252535)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={S.infoRow}>
                    <span style={S.label}>Room ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: 'var(--color-fg, #f4f4fb)', letterSpacing: '0.05em' }}>{createdRoom.roomId}</span>
                      <button onClick={() => handleCopy(createdRoom.roomId, 'id')} style={S.copyBtn(copied === 'id')}>{copied === 'id' ? '✓ Copied' : 'Copy'}</button>
                    </div>
                  </div>
                  {createdRoom.isPrivate && createdRoom.passkey && (
                    <div style={S.infoRow}>
                      <span style={S.label}>Passkey</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--color-fg, #f4f4fb)', letterSpacing: '0.2em' }}>{createdRoom.passkey}</span>
                        <button onClick={() => handleCopy(createdRoom.passkey!, 'passkey')} style={S.copyBtn(copied === 'passkey')}>{copied === 'passkey' ? '✓ Copied' : 'Copy'}</button>
                      </div>
                    </div>
                  )}
                  <div style={S.infoRow}>
                    <span style={S.label}>Visibility</span>
                    <span style={S.typePill(createdRoom.isPrivate)}>{createdRoom.isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                </div>

                {/* Player roster */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={S.label}>Players</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', fontVariantNumeric: 'tabular-nums' }}>
                      {createdRoom.players.length}/{createdRoom.maxPlayers}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {Array.from({ length: createdRoom.maxPlayers }).map((_, i) => {
                      const player = createdRoom.players[i];
                      return player ? (
                        <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '44px' }}>
                          <AvatarCircle userId={player.id} displayName={player.nickname} size={36} />
                          <span style={{ fontSize: '10px', color: 'var(--color-fg-muted, #8888a8)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{player.nickname || '?'}</span>
                        </div>
                      ) : (
                        <div key={`empty-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '44px', opacity: 0.25 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px dashed var(--color-fg-subtle, #3a3a55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '16px', color: 'var(--color-fg-subtle, #3a3a55)', lineHeight: 1 }}>+</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--color-fg-subtle, #3a3a55)', textAlign: 'center' }}>—</span>
                        </div>
                      );
                    })}
                  </div>
                  {createdRoom.players.length < createdRoom.maxPlayers && (
                    <p style={{ fontSize: '12px', color: 'var(--color-fg-subtle, #3a3a55)', margin: 0 }}>
                      Waiting for {createdRoom.maxPlayers - createdRoom.players.length} more player{createdRoom.maxPlayers - createdRoom.players.length !== 1 ? 's' : ''}…
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <Button variant="ghost" fullWidth onClick={handleLeaveRoom}>Leave</Button>
                  <Button variant="primary" fullWidth onClick={handleStartGame} disabled={createdRoom.players.length !== createdRoom.maxPlayers}>
                    Start Game
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* ════ JOIN TAB ════ */}
        {activeTab === 'join' && (
          <>
            {/* Search + Quick Match */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by creator…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...S.input, paddingRight: searchQuery ? '32px' : '12px' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-brand, #6366f1)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border, #252535)')}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fg-muted, #8888a8)', fontSize: '16px', lineHeight: 1, padding: '2px' }}
                  >×</button>
                )}
              </div>
              <Button variant="primary" onClick={handleQuickMatch} size="md">Quick Match</Button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => setShowPublic(v => !v)} style={S.filterChip(showPublic)}>Public</button>
              <button onClick={() => setShowPrivate(v => !v)} style={S.filterChip(showPrivate)}>Private</button>

              {/* Player count stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <button
                    type="button"
                    onClick={() => setExactPlayerCount(prev => { const cur = prev ?? gameInfo.minPlayers; return cur < gameInfo.maxPlayers ? cur + 1 : cur; })}
                    style={{ width: 18, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fg-muted, #8888a8)', fontSize: '9px', lineHeight: 1, padding: '0' }}
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => setExactPlayerCount(prev => { if (prev === null || prev <= gameInfo.minPlayers) return null; return prev - 1; })}
                    style={{ width: 18, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fg-muted, #8888a8)', fontSize: '9px', lineHeight: 1, padding: '0' }}
                  >▼</button>
                </div>
                <button
                  type="button"
                  onClick={() => setExactPlayerCount(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: exactPlayerCount !== null ? 'var(--color-fg, #f4f4fb)' : 'var(--color-fg-muted, #8888a8)', whiteSpace: 'nowrap', padding: '0' }}
                >
                  {exactPlayerCount !== null ? `${exactPlayerCount} players` : 'Any players'}
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px', background: 'var(--color-bg, #09090e)', border: '1px solid var(--color-border, #252535)', borderRadius: '8px', color: 'var(--color-fg-muted, #8888a8)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
                <option value="fastest">Filling fastest</option>
              </select>
            </div>

            {/* Lobby table */}
            <div style={{ background: 'var(--color-bg, #09090e)', border: '1px solid var(--color-border, #252535)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={S.tableHeader}>
                <span>Host</span>
                <span style={{ textAlign: 'center' }}>Players</span>
                <span>Type</span>
                <span />
              </div>

              {loadingLobbies ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-fg-subtle, #3a3a55)' }}>
                  Loading…
                </div>
              ) : filteredLobbies.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-fg-subtle, #3a3a55)' }}>
                  {lobbies.length === 0 ? 'No open lobbies right now.' : 'No lobbies match your filters.'}
                </div>
              ) : (
                filteredLobbies.map((lobby, idx) => {
                  const fillPct = (lobby.playerCount / lobby.maxPlayers) * 100;
                  return (
                    <div
                      key={lobby.roomId}
                      style={S.tableRow(idx)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-raised, #181824)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--color-fg, #f4f4fb)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lobby.creatorName || 'Unknown'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '48px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-fg-muted, #8888a8)', fontVariantNumeric: 'tabular-nums' }}>{lobby.playerCount}/{lobby.maxPlayers}</span>
                        <div style={{ width: '100%', height: '3px', background: 'var(--color-surface-raised, #181824)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${fillPct}%`, background: 'var(--color-success, #4ade80)', borderRadius: '99px', transition: 'width 300ms ease' }} />
                        </div>
                      </div>
                      <span style={S.typePill(lobby.isPrivate)}>{lobby.isPrivate ? 'Private' : 'Public'}</span>
                      <Button variant="secondary" size="sm" onClick={() => handleJoinPublicLobby(lobby.roomId)}>Join</Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchLobbies}
              disabled={loadingLobbies}
              style={{ background: 'none', border: 'none', cursor: loadingLobbies ? 'not-allowed' : 'pointer', fontSize: '12px', color: 'var(--color-fg-subtle, #3a3a55)', padding: '0', textAlign: 'left', transition: 'color 150ms', opacity: loadingLobbies ? 0.5 : 1 }}
              onMouseEnter={e => !loadingLobbies && (e.currentTarget.style.color = 'var(--color-fg-muted, #8888a8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-fg-subtle, #3a3a55)')}
            >
              {loadingLobbies ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
