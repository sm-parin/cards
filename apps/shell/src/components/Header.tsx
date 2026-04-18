'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '@cards/ui';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const displayName = user?.nickname ?? user?.email?.split('@')[0] ?? user?.username ?? 'Guest';
  const isGuest = !user?.id;

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: Cards branding */}
        <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
          Cards
        </Link>

        {/* Right: Explore + Profile area */}
        <div className="flex items-center gap-6">
          {/* Explore link */}
          <Link
            href="/explore"
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            Explore
          </Link>

          {/* Profile area */}
          <button
            onClick={() => {
              if (isGuest) {
                router.push('/login');
              } else {
                router.push('/profile');
              }
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {isGuest ? (
              <>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                  ?
                </div>
                <span className="text-sm text-gray-300">GUEST</span>
              </>
            ) : (
              <>
                <AvatarCircle userId={user.id} displayName={displayName} size={32} />
                <span className="text-sm text-gray-300">{displayName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
