'use client';

import type { PlatformUser } from '@cards/types';
import { PlatformHeader } from './PlatformHeader';

export interface GameHeaderProps {
  authUser: PlatformUser | null;
  shellUrl: string;
  onLogout: () => void;
}

export function GameHeader({ authUser, shellUrl, onLogout }: GameHeaderProps) {
  const isGuest = !authUser || authUser.id === '';
  const displayName = authUser
    ? (authUser.nickname ?? authUser.email?.split('@')[0] ?? authUser.username)
    : undefined;

  return (
    <PlatformHeader
      userId={isGuest ? null : authUser!.id}
      displayName={displayName}
      coins={authUser?.coins}
      shellUrl={shellUrl}
      onLogout={onLogout}
      onAvatarClick={() => { window.location.href = `${shellUrl}/profile`; }}
    />
  );
}
