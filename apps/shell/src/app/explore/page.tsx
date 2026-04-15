'use client';
import Link from 'next/link';
import { GAME_CONFIG } from '@cards/config';
import { useAuth } from '../../context/AuthContext';

export default function ExplorePage() {
  const { loading } = useAuth();

  if (loading) return null;

  const games = Object.entries(GAME_CONFIG);

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-12">Explore Games</h1>

      {/* 2-col grid desktop, 1-col mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {games.map(([gameId, config]) => (
          <Link
            key={gameId}
            href={`/explore/${gameId}`}
            className="group cursor-pointer"
          >
            {/* Game image placeholder */}
            <div className="w-full aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center group-hover:shadow-lg transition-shadow">
              <span className="text-2xl font-bold text-white">{config.displayName}</span>
            </div>

            {/* Game name */}
            <h2 className="text-xl font-semibold text-white group-hover:text-gray-300 transition-colors">
              {config.displayName}
            </h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
