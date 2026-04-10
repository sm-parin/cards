'use client';
import { PlatformHeader } from '@cards/ui';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <PlatformHeader
      userId={user?.id}
      displayName={user?.nickname ?? user?.email?.split('@')[0] ?? user?.username}
      coins={user?.coins}
      shellUrl="/"
      onLogout={() => { logout(); router.replace('/login'); }}
      onAvatarClick={() => router.push('/profile')}
    />
  );
}
