'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getToken, setToken } from '@/utils/socketEmitter';
import { useGameStore } from '@/store/gameStore';
import AppView from '@/components/AppView';
import { registerGameTranslations } from '@cards/i18n';
import { fetchMe } from '@cards/auth';
import gameLocale from '@/config/locales/en.json';

registerGameTranslations('en', gameLocale as Record<string, string>);

function PageContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const tokenHandled = useRef(false);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  useEffect(() => {
    if (tokenHandled.current) return;
    tokenHandled.current = true;

    // Accept token from shell via ?token= URL parameter
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }

    const token = getToken();
    if (token) {
      try {
        const base64 = token.split('.')[1];
        const payload = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
        // Set identity immediately from JWT so socket can connect
        setAuthUser({ id: payload.userId, username: payload.username, email: payload.email, nickname: payload.nickname ?? null, coins: 0 });
        // Fetch real coins from server before rendering; fall back gracefully on error
        fetchMe(token)
          .then((fresh) => {
            if (fresh) setAuthUser({ id: fresh.id, username: fresh.username, email: fresh.email, nickname: fresh.nickname ?? null, coins: fresh.coins });
          })
          .catch(() => { /* server unavailable — keep 0 until syncCoins from socket fires */ })
          .finally(() => setReady(true));
      } catch {
        // Malformed token — play as guest
        setAuthUser({ id: '', username: 'Guest', coins: 0 });
        setReady(true);
      }
    } else {
      // No token — guest mode
      setAuthUser({ id: '', username: 'Guest', coins: 0 });
      setReady(true);
    }
  }, [searchParams, setAuthUser]);

  if (!ready) return null;

  return <AppView />;
}

export default function Page() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
