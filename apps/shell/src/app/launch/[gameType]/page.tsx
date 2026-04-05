'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { GAME_CONFIG } from '@cards/config';

export default function LaunchPage() {
  const params = useParams();
  const router = useRouter();
  const { token, loading } = useAuth();
  const gameType = params.gameType as string;

  useEffect(() => {
    if (loading) return;

    const config = GAME_CONFIG[gameType as keyof typeof GAME_CONFIG];
    if (!config) {
      router.replace('/');
      return;
    }

    const gameUrl = new URL(config.url);
    // Pass token if logged in; guests go without one
    if (token) gameUrl.searchParams.set('token', token);
    // replace() so the launch page is not in browser history
    window.location.replace(gameUrl.toString());
  }, [loading, token, gameType, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Launching game...</p>
    </div>
  );
}
