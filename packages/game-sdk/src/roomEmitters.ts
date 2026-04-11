import { CLIENT_EVENTS } from '@cards/types';

interface MinSocket {
  emit: (event: string, ...args: unknown[]) => void;
}

export interface RoomEmitters {
  getToken: () => string;
  setToken: (token: string) => void;
  clearToken: () => void;
  emitInitPlayer: () => void;
  emitPlayNow: (excludeRoomId?: string) => void;
  emitCreatePrivateRoom: (maxPlayers?: number) => void;
  emitJoinPrivateRoom: (passkey: string) => void;
  emitUpdateMaxPlayers: (roomId: string, maxPlayers: number) => void;
  emitLeaveRoom: (roomId: string) => void;
  emitGetLobbies: () => void;
  emitCreatePublicLobby: (maxPlayers?: number) => void;
  emitJoinPublicLobby: (roomId: string) => void;
}

/**
 * Creates the 12 shared room/lobby emitter functions for a game.
 *
 * @param socket           - Socket instance (must have `.emit`)
 * @param tokenKey         - localStorage key for the game's JWT
 * @param defaultMaxPlayers - Default player cap for create-room calls
 */
export function createRoomEmitters(
  socket: MinSocket,
  tokenKey: string,
  defaultMaxPlayers = 5,
): RoomEmitters {
  return {
    getToken: () =>
      typeof window === 'undefined' ? '' : (localStorage.getItem(tokenKey) ?? ''),
    setToken: (token) => {
      if (typeof window !== 'undefined') localStorage.setItem(tokenKey, token);
    },
    clearToken: () => {
      if (typeof window !== 'undefined') localStorage.removeItem(tokenKey);
    },
    emitInitPlayer: () => socket.emit(CLIENT_EVENTS.INIT_PLAYER),
    emitPlayNow: (excludeRoomId?) =>
      socket.emit(CLIENT_EVENTS.PLAY_NOW, {
        ...(excludeRoomId ? { excludeRoomId } : {}),
      }),
    emitCreatePrivateRoom: (maxPlayers = defaultMaxPlayers) =>
      socket.emit(CLIENT_EVENTS.CREATE_PRIVATE_ROOM, { maxPlayers }),
    emitJoinPrivateRoom: (passkey) =>
      socket.emit(CLIENT_EVENTS.JOIN_PRIVATE_ROOM, { passkey }),
    emitUpdateMaxPlayers: (roomId, maxPlayers) =>
      socket.emit(CLIENT_EVENTS.UPDATE_MAX_PLAYERS, { roomId, maxPlayers }),
    emitLeaveRoom: (roomId) => socket.emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId }),
    emitGetLobbies: () => socket.emit(CLIENT_EVENTS.GET_LOBBIES),
    emitCreatePublicLobby: (maxPlayers = defaultMaxPlayers) =>
      socket.emit(CLIENT_EVENTS.CREATE_PUBLIC_LOBBY, { maxPlayers }),
    emitJoinPublicLobby: (roomId) =>
      socket.emit(CLIENT_EVENTS.JOIN_PUBLIC_LOBBY, { roomId }),
  };
}
