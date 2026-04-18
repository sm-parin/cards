'use client';
import Link from 'next/link';
import { GAME_CONFIG } from '@cards/config';
import { useAuth } from '../../context/AuthContext';

export default function ExplorePage() {
  const { loading } = useAuth();
  if (loading) return null;

  const games = Object.entries(GAME_CONFIG);

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      {/* Header */}
      <div className="mb-12">
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ color: 'var(--color-fg)' }}
        >
          Games
        </h1>
        <p style={{ color: 'var(--color-fg-muted)' }}>
          Choose a game and find a lobby to join.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {games.map(([gameId, config]) => (
          <Link key={gameId} href={`/explore/${gameId}`} className="group block">
            <div
              className="rounded-2xl overflow-hidden border transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              {/* Banner */}
              <div
                className="relative h-48 flex flex-col items-center justify-center"
                style={{ background: config.theme.gradient }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 25% 40%, rgba(255,255,255,0.12) 0%, transparent 55%)',
                  }}
                />
                <span className="text-6xl relative z-10 mb-1">{config.theme.symbol}</span>
                <span
                  className="relative z-10 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {config.theme.playerRange} players
                </span>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <div>
                  <h2
                    className="text-lg font-semibold mb-0.5"
                    style={{ color: 'var(--color-fg)' }}
                  >
                    {config.displayName}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                    Real-time multiplayer
                  </p>
                </div>
                <span
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                  style={{
                    background: `color-mix(in srgb, ${config.theme.accentColor} 15%, transparent)`,
                    color: config.theme.accentColor,
                    border: `1px solid color-mix(in srgb, ${config.theme.accentColor} 30%, transparent)`,
                  }}
                >
                  Play
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
