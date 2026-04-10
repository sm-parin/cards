'use client';
import { PlatformHeader } from '@cards/ui';
import { useGameStore } from '@/store/gameStore';
import { clearToken } from '@/utils/socketEmitter';

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';

export default function GameHeader() {
  const authUser = useGameStore((s) => s.authUser);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  const isGuest = !authUser || authUser.id === '';
  const displayName = authUser
    ? (authUser.nickname ?? authUser.email?.split('@')[0] ?? authUser.username)
    : undefined;

  function handleLogout() {
    clearToken();
    setAuthUser({ id: '', username: 'Guest', coins: 0 });
  }

  return (
    <PlatformHeader
      userId={isGuest ? null : authUser!.id}
      displayName={displayName}
      coins={authUser?.coins}
      shellUrl={SHELL_URL}
      onLogout={handleLogout}
      onAvatarClick={() => { window.location.href = `${SHELL_URL}/profile`; }}
    />
  );
}
