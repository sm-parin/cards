'use client';
import { useGameStore } from '@/store/gameStore';
import { clearToken } from '@/utils/socketEmitter';

const SHELL_URL = process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';

export default function GameHeader() {
  const authUser = useGameStore((s) => s.authUser);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  const isGuest = !authUser || authUser.id === '' || authUser.username === 'Guest';

  function handleLogout() {
    clearToken();
    setAuthUser({ id: '', username: 'Guest', coins: 0 });
  }

  return (
    <header style={{
      borderBottom: '1px solid #1f2937',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#0a0a0a',
    }}>
      <a href={SHELL_URL} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
        Cards
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isGuest ? (
          <a
            href={`${SHELL_URL}/login`}
            style={{ fontSize: '14px', color: '#d1d5db', textDecoration: 'none' }}
          >
            Login
          </a>
        ) : (
          <>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>{authUser.coins} coins</span>
            <span style={{ fontSize: '14px', color: '#fff' }}>{authUser.username}</span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: '14px',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
