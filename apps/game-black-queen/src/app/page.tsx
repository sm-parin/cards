'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getToken, setToken } from '@/utils/socketEmitter';
import { useGameStore } from '@/store/gameStore';
import AppView from '@/components/AppView';

function PageContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const tokenHandled = useRef(false);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  useEffect(() => {
    if (tokenHandled.current) return;
    tokenHandled.current = true;

    // Check if token was passed in the URL from the shell
    const urlToken = searchParams.get('token');
    if (urlToken) {
      // Store it and clean the URL (don't leave token in browser history)
      setToken(urlToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }

    // Now check if we have a valid token
    const token = getToken();
    if (!token) {
      // No token anywhere — send back to shell to log in
      const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';
      window.location.href = `${shellUrl}/login`;
      return;
    }

    // Decode token to pre-populate authUser (needed by useSocket's findSelf)
    try {
      const base64 = token.split('.')[1];
      const payload = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
      setAuthUser({ id: payload.userId, username: payload.username, coins: 0 });
    } catch {
      // Malformed token — treat as unauthenticated
      const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';
      window.location.href = `${shellUrl}/login`;
      return;
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
