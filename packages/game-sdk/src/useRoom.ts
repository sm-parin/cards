import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './createSocket';
import { SERVER_EVENTS } from '@cards/types';
import type { Room, RoomPlayer } from '@cards/types';

interface UseRoomReturn<TRoom extends Room> {
  room: TRoom | null;
  leaveRoom: (roomId: string) => void;
}

/**
 * Subscribe to room state updates (ROOM_UPDATE).
 * Generic over the concrete Room type so games retain full type safety.
 *
 * @example
 * // In a game's hook
 * const { room } = useRoom<BqRoom>(initialRoom);
 */
export function useRoom<TRoom extends Room>(
  initialRoom?: TRoom
): UseRoomReturn<TRoom> {
  const [room, setRoom] = useState<TRoom | null>(initialRoom ?? null);

  useEffect(() => {
    const socket = getSocket();

    const onRoomUpdate = (payload: { players: RoomPlayer[]; maxPlayers?: number }) => {
      setRoom(prev =>
        prev
          ? {
              ...prev,
              players: payload.players,
              ...(payload.maxPlayers !== undefined
                ? { maxPlayers: payload.maxPlayers }
                : {}),
            }
          : prev
      );
    };

    socket.on(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate);
    return () => { socket.off(SERVER_EVENTS.ROOM_UPDATE, onRoomUpdate); };
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    getSocket().emit('LEAVE_ROOM', { roomId });
  }, []);

  return { room, leaveRoom };
}
