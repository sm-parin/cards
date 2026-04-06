'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getToken, setToken } from '@/utils/socketEmitter';
import { useGameStore } from '@/store/gameStore';
import AppView from '@/components/AppView';
import { registerGameTranslations } from '@cards/i18n';
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
        setAuthUser({ id: payload.userId, username: payload.username, email: payload.email, nickname: payload.nickname ?? null, coins: 0 });
      } catch {
        // Malformed token — play as guest
        setAuthUser({ id: '', username: 'Guest', coins: 0 });
      }
    } else {
      // No token — guest mode
      setAuthUser({ id: '', username: 'Guest', coins: 0 });
    }

    setReady(true);
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
