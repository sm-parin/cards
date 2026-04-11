'use client';
import { GameHeader } from '@cards/ui';
import { useGameStore } from '@/store/gameStore';
import { clearToken } from '@/utils/socketEmitter';

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';

export default function GameHeaderWrapper() {
  const authUser = useGameStore((s) => s.authUser);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  return (
    <GameHeader
      authUser={authUser}
      shellUrl={SHELL_URL}
      onLogout={() => {
        clearToken();
        setAuthUser({ id: '', username: 'Guest', coins: 0 });
      }}
    />
  );
}
