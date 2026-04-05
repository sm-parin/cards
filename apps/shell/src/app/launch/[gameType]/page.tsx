'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { GAME_CONFIG } from '@cards/config';

export default function LaunchPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const gameType = params.gameType as string;

  useEffect(() => {
    if (loading) return;

    // Not logged in → send to login
    if (!user || !token) {
      router.replace('/login');
      return;
    }

    const config = GAME_CONFIG[gameType as keyof typeof GAME_CONFIG];
    if (!config) {
      router.replace('/');
      return;
    }

    // Redirect to game URL with token in query param
    const gameUrl = new URL(config.url);
    gameUrl.searchParams.set('token', token);
    window.location.href = gameUrl.toString();
  }, [loading, user, token, gameType, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Launching game...</p>
    </div>
  );
}
