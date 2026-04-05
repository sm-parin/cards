import { io, type Socket } from 'socket.io-client';

export type GameSocket = Socket;

let _socket: GameSocket | null = null;

/**
 * Create (or return existing) authenticated socket connection.
 * Call this once per game on startup.
 *
 * Token is read freshly on each connect/reconnect via the auth callback,
 * so it stays current even if the token is refreshed.
 *
 * @param tokenKey  localStorage key for the game's JWT (e.g. 'bq_token', 'jt_token')
 * @param serverUrl Socket.IO server URL (e.g. process.env.NEXT_PUBLIC_SOCKET_URL)
 */
export function createGameSocket(
  tokenKey: string,
  serverUrl: string
): GameSocket {
  if (_socket?.connected) return _socket;

  _socket = io(serverUrl, {
    autoConnect:          false,
    transports:           ['websocket'],
    reconnection:         true,
    reconnectionDelay:    1000,
    reconnectionAttempts: 10,
    timeout:              10000,
    auth: (cb: (data: { token: string }) => void) => {
      const token =
        typeof window !== 'undefined'
          ? (localStorage.getItem(tokenKey) ?? '')
          : '';
      cb({ token });
    },
  });

  return _socket;
}

/**
 * Get the existing socket instance.
 * Throws if createGameSocket() has not been called yet.
 */
export function getSocket(): GameSocket {
  if (!_socket) {
    throw new Error(
      'getSocket() called before createGameSocket(). ' +
      'Call createGameSocket() in your app config/socket.ts.'
    );
  }
  return _socket;
}

/**
 * Disconnect and destroy the socket.
 * Call on logout or when the game app unmounts.
 */
export function destroySocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
