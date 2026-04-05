'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { GAME_CONFIG } from '@cards/config';
import Header from '../components/Header';

export default function Dashboard() {
  const { loading } = useAuth();

  if (loading) return null;

  const games = Object.entries(GAME_CONFIG);

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8">Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {games.map(([key, config]) => (
            <Link
              key={key}
              href={`/launch/${key}`}
              className="block p-6 rounded-xl border border-gray-800
                         hover:border-gray-600 bg-gray-900 hover:bg-gray-800
                         transition-colors"
            >
              <h3 className="text-xl font-semibold">{config.displayName}</h3>
              <p className="text-gray-400 text-sm mt-1">{config.description}</p>
              <p className="text-xs text-gray-600 mt-3">
                {(config.minPlayers as number) === (config.maxPlayers as number)
                  ? `${config.minPlayers} players`
                  : `${config.minPlayers}–${config.maxPlayers} players`}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
