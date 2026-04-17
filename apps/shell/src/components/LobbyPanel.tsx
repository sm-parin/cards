'use client';import { useState, useEffect, useCallback } from 'react';import { Button } from '@cards/ui';import { CLIENT_EVENTS, SERVER_EVENTS, JT_SERVER_EVENTS } from '@cards/types';import { getSocket } from '../config/socket';import { useAuth } from '../context/AuthContext';import AvatarCircle from './AvatarCircle';import type { GameConfig, GameInfo, GameType } from '@cards/config';

interface Room {
  roomId: string;
  players: Array<{ id: string; nickname: string }>;
  maxPlayers: number;
  isPrivate: boolean;
  passkey: string | null;
}

interface LobbyEntry {
  roomId: string;
  creatorName: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
}

type Tab = 'create' | 'join';
type SortOrder = 'oldest' | 'newest' | 'fastest';

interface LobbyPanelProps {
  config: GameConfig;
  gameId: GameType;
  gameInfo: GameInfo;
}

export default function LobbyPanel({ config, gameId, gameInfo }: LobbyPanelProps) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('create');

  // Create Lobby state
  const [playerCount, setPlayerCount] = useState(gameInfo.minPlayers);
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState<'id' | 'passkey' | null>(null);

  // Join Lobby state
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPublic, setShowPublic] = useState(true);
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [exactPlayerCount, setExactPlayerCount] = useState<number | null>(null);

  // Socket connection & events
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const navigateToGame = () => {
      const gameUrl = new URL(config.url);
      if (token) gameUrl.searchParams.set('token', token);
      window.location.replace(gameUrl.toString());
    };

    const handleRoomJoined = (payload: { room: Room }) => {
      setCreatedRoom(payload.room);
      setCreatingLobby(false);
      setActiveTab('create');
    };

    const handleRoomUpdate = (payload: { players: Array<{ id: string; nickname: string }>; maxPlayers?: number }) => {
      setCreatedRoom(prev => prev ? { ...prev, players: payload.players, maxPlayers: payload.maxPlayers ?? prev.maxPlayers } : prev);
    };

    const handleLobbiesList = (payload: { lobbies: LobbyEntry[] }) => {
      setLobbies(payload.lobbies);
      setLoadingLobbies(false);
    };

    socket.on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
    socket.on(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
    socket.on(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);
    socket.on(SERVER_EVENTS.GAME_STARTED, navigateToGame);
    socket.on(JT_SERVER_EVENTS.JT_GAME_STARTED, navigateToGame);

    return () => {
      socket.off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
      socket.off(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
      socket.off(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);
      socket.off(SERVER_EVENTS.GAME_STARTED, navigateToGame);
      socket.off(JT_SERVER_EVENTS.JT_GAME_STARTED, navigateToGame);
    };
  }, [config.url, token]);

  const fetchLobbies = useCallback(() => {
    const socket = getSocket();
    setLoadingLobbies(true);
    socket.emit(CLIENT_EVENTS.GET_LOBBIES);
  }, []);

  useEffect(() => {
    if (activeTab === 'join') fetchLobbies();
  }, [activeTab, fetchLobbies]);

  // Handlers
  const handleCreatePublic = () => {
    setCreatingLobby(true);
    getSocket().emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers: playerCount });
  };

  const handleCreatePrivate = () => {
    setCreatingLobby(true);
    getSocket().emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers: playerCount });
  };

  const handleLeaveRoom = () => {
    if (createdRoom) {
      getSocket().emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId: createdRoom.roomId });
      setCreatedRoom(null);
    }
  };

  const handleStartGame = () => {
    if (createdRoom && createdRoom.players.length === createdRoom.maxPlayers) {
      getSocket().emit(CLIENT_EVENTS.START_GAME, { roomId: createdRoom.roomId });
    }
  };

  const handleJoinPublicLobby = (roomId: string) => {
    getSocket().emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId });
  };

  const handleQuickMatch = () => {
    getSocket().emit(CLIENT_EVENTS.PLAY_NOW);
  };

  const handleCopy = (text: string, type: 'id' | 'passkey') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Filtered & sorted lobbies
  const filteredLobbies = lobbies
    .filter(l => {
      if (!showPublic && !l.isPrivate) return false;
      if (!showPrivate && l.isPrivate) return false;
      if (searchQuery && !l.creatorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (exactPlayerCount !== null && l.maxPlayers !== exactPlayerCount) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'fastest') {
        const diffA = a.maxPlayers - a.playerCount;
        const diffB = b.maxPlayers - b.playerCount;
        if (diffA !== diffB) return diffA - diffB;
        return 0;
      }
      return sortOrder === 'newest' ? -1 : 1;
    });

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700/50">
        {(['create', 'join'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-white bg-gray-800/40'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'create' ? 'Create Lobby' : 'Join Lobby'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── Create Lobby Tab ── */}
        {activeTab === 'create' && (
          <div>
            {!createdRoom ? (
              // PRE state
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-300 font-medium">Players</label>
                    <span className="text-white font-semibold tabular-nums text-sm bg-gray-700 px-2.5 py-0.5 rounded-full">
                      {playerCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={gameInfo.minPlayers}
                    max={gameInfo.maxPlayers}
                    value={playerCount}
                    onChange={e => setPlayerCount(Number(e.target.value))}
                    className="w-full accent-white"
                    disabled={creatingLobby}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{gameInfo.minPlayers}</span>
                    <span>{gameInfo.maxPlayers}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button variant="primary" onClick={handleCreatePublic} disabled={creatingLobby} className="w-full">
                    {creatingLobby ? '...' : 'Public'}
                  </Button>
                  <Button variant="secondary" onClick={handleCreatePrivate} disabled={creatingLobby} className="w-full">
                    {creatingLobby ? '...' : 'Private'}
                  </Button>
                </div>
              </div>
            ) : (
              // POST state — room created
              <div className="space-y-5">
                {/* Room info */}
                <div className="bg-gray-900/60 rounded-lg p-4 space-y-3 border border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Room ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white">{createdRoom.roomId}</span>
                      <button
                        onClick={() => handleCopy(createdRoom.roomId, 'id')}
                        className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-600 rounded px-1.5 py-0.5"
                      >
                        {copied === 'id' ? '✓' : 'copy'}
                      </button>
                    </div>
                  </div>

                  {createdRoom.isPrivate && createdRoom.passkey && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Passkey</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white tracking-widest">{createdRoom.passkey}</span>
                        <button
                          onClick={() => handleCopy(createdRoom.passkey!, 'passkey')}
                          className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-600 rounded px-1.5 py-0.5"
                        >
                          {copied === 'passkey' ? '✓' : 'copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Type</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      createdRoom.isPrivate
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {createdRoom.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                </div>

                {/* Player slots */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300 font-medium">
                      Players
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {createdRoom.players.length}/{createdRoom.maxPlayers}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: createdRoom.maxPlayers }).map((_, i) => {
                      const player = createdRoom.players[i];
                      return player ? (
                        <div key={player.id} className="flex flex-col items-center gap-1.5">
                          <AvatarCircle userId={player.id} displayName={player.nickname} size={38} />
                          <span className="text-xs text-gray-300 text-center truncate w-full leading-tight">
                            {player.nickname || '?'}
                          </span>
                        </div>
                      ) : (
                        <div key={`empty-${i}`} className="flex flex-col items-center gap-1.5 opacity-30">
                          <div
                            style={{ width: 38, height: 38 }}
                            className="rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center"
                          >
                            <span className="text-gray-500 text-lg">+</span>
                          </div>
                          <span className="text-xs text-gray-500 text-center">waiting</span>
                        </div>
                      );
                    })}
                  </div>

                  {createdRoom.players.length < createdRoom.maxPlayers && (
                    <p className="text-xs text-gray-500 mt-3">
                      Waiting for {createdRoom.maxPlayers - createdRoom.players.length} more player{createdRoom.maxPlayers - createdRoom.players.length !== 1 ? 's' : ''}…
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={handleLeaveRoom} className="flex-1">
                    Leave
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleStartGame}
                    disabled={createdRoom.players.length !== createdRoom.maxPlayers}
                    className="flex-1"
                  >
                    Start Game
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Join Lobby Tab ── */}
        {activeTab === 'join' && (
          <div className="space-y-4">
            {/* Search + Quick Match */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by creator…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button variant="primary" onClick={handleQuickMatch} className="shrink-0">
                Quick Match
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Room Type — multiselect toggles */}
              <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setShowPublic(v => !v)}
                  className={`px-3 py-1.5 transition-colors ${
                    showPublic
                      ? 'bg-blue-600/30 text-blue-300 border-r border-gray-700'
                      : 'bg-transparent text-gray-500 border-r border-gray-700 hover:text-gray-300'
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() => setShowPrivate(v => !v)}
                  className={`px-3 py-1.5 transition-colors ${
                    showPrivate
                      ? 'bg-orange-600/20 text-orange-300'
                      : 'bg-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Private
                </button>
              </div>

              {/* Player Count — stepper */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => setExactPlayerCount(prev => {
                      const cur = prev ?? gameInfo.minPlayers;
                      return cur < gameInfo.maxPlayers ? cur + 1 : cur;
                    })}
                    className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-[10px] leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => setExactPlayerCount(prev => {
                      if (prev === null || prev <= gameInfo.minPlayers) return null;
                      return prev - 1;
                    })}
                    className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-[10px] leading-none"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setExactPlayerCount(null)}
                  title="Reset"
                  className={`text-sm font-medium tabular-nums transition-colors min-w-18 text-left ${
                    exactPlayerCount !== null ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {exactPlayerCount !== null ? `${exactPlayerCount} Players` : 'Any players'}
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                className="ml-auto px-2 py-1.5 text-xs bg-gray-900/60 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-gray-500"
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
                <option value="fastest">Filling fastest</option>
              </select>
            </div>

            {/* Lobby list */}
            <div className="rounded-lg border border-gray-700/40 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 bg-gray-900/40 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-700/40">
                <span>Host</span>
                <span className="text-center">Players</span>
                <span className="text-center">Type</span>
                <span></span>
              </div>

              {loadingLobbies ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
              ) : filteredLobbies.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {lobbies.length === 0 ? 'No open lobbies right now.' : 'No lobbies match your filters.'}
                </div>
              ) : (
                filteredLobbies.map((lobby, idx) => {
                  const fillPct = (lobby.playerCount / lobby.maxPlayers) * 100;
                  return (
                    <div
                      key={lobby.roomId}
                      className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm transition-colors hover:bg-gray-700/20 ${
                        idx !== 0 ? 'border-t border-gray-700/30' : ''
                      }`}
                    >
                      <span className="text-white font-medium truncate">{lobby.creatorName || 'Unknown'}</span>

                      <div className="flex flex-col items-center gap-1 min-w-13">
                        <span className="text-gray-300 tabular-nums text-xs">
                          {lobby.playerCount}/{lobby.maxPlayers}
                        </span>
                        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>

                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        lobby.isPrivate
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {lobby.isPrivate ? 'Private' : 'Public'}
                      </span>

                      <Button
                        variant="secondary"
                        onClick={() => handleJoinPublicLobby(lobby.roomId)}
                        className="py-1! px-3! text-xs!"
                      >
                        Join
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchLobbies}
              disabled={loadingLobbies}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {loadingLobbies ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
