'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@cards/ui';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@cards/types';
import { getSocket } from '../config/socket';
import { useAuth } from '../context/AuthContext';
import AvatarCircle from './AvatarCircle';
import type { GameConfig, GameType } from '@cards/config';

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

interface LobbyPanelProps {
  config: GameConfig;
  gameId: GameType;
}

export default function LobbyPanel({ config, gameId }: LobbyPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('create');

  // Create Lobby state
  const [playerCount, setPlayerCount] = useState(config.minPlayers);
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);

  // Join Lobby state
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lobbyType, setLobbyType] = useState<'all' | 'public' | 'private'>('all');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest' | 'fastest'>('oldest');
  const [loadingLobbies, setLoadingLobbies] = useState(false);

  // Socket connection & events
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Room events for Create Lobby
    const handleRoomJoined = (payload: { room: Room }) => {
      setCreatedRoom(payload.room);
      setCreatingLobby(false);
    };

    const handleRoomUpdate = (payload: { players: Array<{ id: string; nickname: string }>; maxPlayers?: number }) => {
      setCreatedRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: payload.players,
          maxPlayers: payload.maxPlayers ?? prev.maxPlayers,
        };
      });
    };

    // Lobbies list for Join Lobby
    const handleLobbiesList = (payload: { lobbies: LobbyEntry[] }) => {
      setLobbies(payload.lobbies);
      setLoadingLobbies(false);
    };

    socket.on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
    socket.on(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
    socket.on(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);

    return () => {
      socket.off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
      socket.off(SERVER_EVENTS.ROOM_UPDATE, handleRoomUpdate);
      socket.off(SERVER_EVENTS.LOBBIES_LIST, handleLobbiesList);
    };
  }, []);

  // Fetch lobbies on Join tab open
  const fetchLobbies = useCallback(() => {
    const socket = getSocket();
    setLoadingLobbies(true);
    socket.emit(CLIENT_EVENTS.GET_LOBBIES);
  }, []);

  useEffect(() => {
    if (activeTab === 'join') {
      fetchLobbies();
    }
  }, [activeTab, fetchLobbies]);

  // Create Lobby handlers
  const handleCreatePublic = () => {
    const socket = getSocket();
    setCreatingLobby(true);
    socket.emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers: playerCount });
  };

  const handleCreatePrivate = () => {
    const socket = getSocket();
    setCreatingLobby(true);
    socket.emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers: playerCount });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    if (createdRoom) {
      socket.emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId: createdRoom.roomId });
      setCreatedRoom(null);
    }
  };

  const handleStartGame = () => {
    const socket = getSocket();
    if (createdRoom && createdRoom.players.length === createdRoom.maxPlayers) {
      socket.emit(CLIENT_EVENTS.START_GAME, { roomId: createdRoom.roomId });
    }
  };

  // Join Lobby handlers
  const handleJoinPublicLobby = (roomId: string) => {
    const socket = getSocket();
    socket.emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId });
  };

  const handleQuickMatch = () => {
    const socket = getSocket();
    socket.emit(CLIENT_EVENTS.PLAY_NOW);
  };

  // Filter & sort lobbies
  const filteredLobbies = lobbies
    .filter(l => {
      if (lobbyType === 'public' && l.isPrivate) return false;
      if (lobbyType === 'private' && !l.isPrivate) return false;
      if (searchQuery && !l.creatorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'fastest') {
        const diffA = a.maxPlayers - a.playerCount;
        const diffB = b.maxPlayers - b.playerCount;
        return diffA - diffB;
      } else if (sortOrder === 'newest') {
        return -1; // Server order is creation time, so reverse
      }
      return 1; // oldest = server order
    });

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
        {(['create', 'join'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize font-medium pb-2 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'create' ? 'Create a Lobby' : 'Join a Lobby'}
          </button>
        ))}
      </div>

      {/* Create Lobby Tab */}
      {activeTab === 'create' && (
        <div>
          {!createdRoom ? (
            // PRE state
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">No. of players</label>
                <input
                  type="number"
                  min={config.minPlayers}
                  max={config.maxPlayers}
                  value={playerCount}
                  onChange={e => setPlayerCount(Math.min(config.maxPlayers, Math.max(config.minPlayers, parseInt(e.target.value))) as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  disabled={creatingLobby}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleCreatePublic}
                  disabled={creatingLobby}
                  className="flex-1"
                >
                  {creatingLobby ? '...' : 'Create Public Lobby'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCreatePrivate}
                  disabled={creatingLobby}
                  className="flex-1"
                >
                  {creatingLobby ? '...' : 'Create Private Lobby'}
                </Button>
              </div>
            </div>
          ) : (
            // POST state
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Lobby ID</label>
                <p className="text-white font-mono text-sm">{createdRoom.roomId}</p>
              </div>

              {createdRoom.isPrivate && createdRoom.passkey && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Passkey</label>
                  <p className="text-white font-mono text-sm">{createdRoom.passkey}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">Max Players</label>
                <p className="text-white">{createdRoom.maxPlayers}</p>
              </div>

              {/* Players section */}
              <div>
                <label className="block text-sm text-gray-300 mb-3">
                  Players ({createdRoom.players.length}/{createdRoom.maxPlayers})
                </label>
                {createdRoom.players.length < createdRoom.maxPlayers && (
                  <p className="text-xs text-gray-400 mb-3">Waiting for players...</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {createdRoom.players.map(player => (
                    <div key={player.id} className="flex flex-col items-center gap-2">
                      <AvatarCircle userId={player.id} displayName={player.nickname} size={40} />
                      <span className="text-xs text-gray-300 text-center">{player.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleLeaveRoom}
                  className="flex-1"
                >
                  Exit
                </Button>
                <Button
                  variant="primary"
                  onClick={handleStartGame}
                  disabled={createdRoom.players.length !== createdRoom.maxPlayers}
                  className="flex-1"
                >
                  Start
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Join Lobby Tab */}
      {activeTab === 'join' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search lobbies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white transition-colors text-lg"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Match button */}
          <Button
            variant="primary"
            onClick={handleQuickMatch}
            className="w-full"
          >
            Quick Match
          </Button>

          {/* Filters row */}
          <div className="flex gap-2">
            <select
              value={lobbyType}
              onChange={e => setLobbyType(e.target.value as 'all' | 'public' | 'private')}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-2 text-white text-sm"
            >
              <option value="all">All Lobbies</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'oldest' | 'newest' | 'fastest')}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-2 text-white text-sm"
            >
              <option value="oldest">Oldest to Newest</option>
              <option value="newest">Newest to Oldest</option>
              <option value="fastest">Fastest</option>
            </select>
          </div>

          {/* Lobbies table */}
          {loadingLobbies ? (
            <p className="text-gray-400 text-sm">Loading lobbies...</p>
          ) : filteredLobbies.length === 0 ? (
            <p className="text-gray-400 text-sm">No lobbies found</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLobbies.map(lobby => (
                <div
                  key={lobby.roomId}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-700"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{lobby.creatorName}'s {lobby.isPrivate ? 'room' : 'lobby'}</p>
                    <p className="text-xs text-gray-400">
                      {lobby.playerCount}/{lobby.maxPlayers} players
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleJoinPublicLobby(lobby.roomId)}
                    className="text-xs"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
