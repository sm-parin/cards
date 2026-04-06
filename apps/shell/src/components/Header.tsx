'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import AvatarCircle from './AvatarCircle';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <span className="font-semibold text-white">Cards</span>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-400">{user.coins} coins</span>
            <Link href="/profile">
              <AvatarCircle
                userId={user.id}
                displayName={user.nickname ?? user.email?.split('@')[0] ?? user.username}
                size={32}
              />
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
