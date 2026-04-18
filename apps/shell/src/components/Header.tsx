'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '@cards/ui';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const displayName = user?.nickname ?? user?.email?.split('@')[0] ?? user?.username ?? 'Guest';
  const isGuest = !user?.id;

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--color-border)',
        height: '56px',
      }}
    >
      <div
        className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between"
      >
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-sm tracking-tight transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-fg)', letterSpacing: '-0.01em', fontSize: '15px' }}
        >
          Cards
        </Link>

        {/* Nav + user */}
        <div className="flex items-center gap-6">
          <Link
            href="/explore"
            className="text-sm font-medium transition-colors"
            style={{ color: pathname === '/explore' ? 'var(--color-fg)' : 'var(--color-fg-muted)' }}
          >
            Explore
          </Link>

          <button
            onClick={() => router.push(isGuest ? '/login' : '/profile')}
            className="flex items-center gap-2 transition-opacity hover:opacity-75"
          >
            {isGuest ? (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--color-surface-raised)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}
                >
                  ?
                </div>
                <span className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
                  Sign in
                </span>
              </>
            ) : (
              <>
                <AvatarCircle userId={user.id} displayName={displayName} size={28} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>
                  {displayName}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
