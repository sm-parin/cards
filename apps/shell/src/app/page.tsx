'use client';
import Link from 'next/link';
import { Button } from '@cards/ui';
import { GAME_CONFIG } from '@cards/config';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return null;

  const games = Object.entries(GAME_CONFIG);

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[55vh] px-6 py-24 text-center overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 30%, color-mix(in srgb, var(--color-brand) 12%, transparent) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-fg-muted)', background: 'var(--color-surface)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
            Servers online
          </div>

          <h1
            className="text-6xl sm:text-7xl font-bold tracking-tight mb-5 leading-none"
            style={{
              background: 'linear-gradient(160deg, var(--color-fg) 0%, color-mix(in srgb, var(--color-brand) 80%, var(--color-fg)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Dream Cards
          </h1>

          <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>
            Real-time multiplayer card games.<br />Pick a game, find a lobby, play.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/explore">
              <Button variant="primary" size="lg">Browse Games</Button>
            </Link>
            {!user?.id && (
              <Link href="/login">
                <Button variant="secondary" size="lg">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Game Cards ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-3xl mx-auto w-full">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-6 text-center"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Available now
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {games.map(([gameId, config]) => (
            <Link key={gameId} href={`/explore/${gameId}`} className="group block">
              <div
                className="rounded-2xl overflow-hidden border transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-surface)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                {/* Banner */}
                <div
                  className="h-36 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                  style={{ background: config.theme.gradient }}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)' }}
                  />
                  <span className="text-5xl relative z-10">{config.theme.symbol}</span>
                </div>

                {/* Info */}
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <h3
                      className="text-base font-semibold mb-0.5"
                      style={{ color: 'var(--color-fg)' }}
                    >
                      {config.displayName}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                      {config.theme.playerRange} players
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: config.theme.accentColor }}
                  >
                    Play →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
