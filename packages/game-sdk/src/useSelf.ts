import { useMemo, useCallback } from 'react';
import { decodeToken } from '@cards/auth';
import type { RoomPlayer } from '@cards/types';

interface UseSelfReturn {
  userId: string | null;
  username: string | null;
  findSelf: (players: RoomPlayer[]) => RoomPlayer | undefined;
}

/**
 * Get the current user's identity from the JWT stored in localStorage.
 * Does not require a network call.
 *
 * @param tokenKey  localStorage key for this game's token.
 *                  Defaults to 'bq_token'; pass 'jt_token' for Jack Thief.
 */
export function useSelf(tokenKey = 'bq_token'): UseSelfReturn {
  const payload = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    return decodeToken(token);
  }, [tokenKey]);

  const findSelf = useCallback(
    (players: RoomPlayer[]) =>
      players.find(p => p.id === payload?.userId),
    [payload?.userId]
  );

  return {
    userId:   payload?.userId ?? null,
    username: payload?.username ?? null,
    findSelf,
  };
}
