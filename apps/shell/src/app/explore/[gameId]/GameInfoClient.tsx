'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, LobbyPanel, RulesModal } from '@cards/ui';
import { getSocket } from '../../../config/socket';
import { useAuth } from '../../../context/AuthContext';
import type { GameConfig, GameInfo, GameType } from '@cards/config';
import { GAME_CONFIG } from '@cards/config';

interface Props {
  gameId: GameType;
  config: GameConfig;
  gameInfo: GameInfo;
}

export default function GameInfoClient({ gameId, config, gameInfo }: Props) {
  const [showRules, setShowRules] = useState(false);
  const { token } = useAuth();

  const gameTheme = (GAME_CONFIG as Record<string, typeof config & { theme?: { gradient?: string; symbol?: string; accentColor?: string; playerRange?: string } }>)[gameId]?.theme;

  const playerRange =
    gameInfo.minPlayers === gameInfo.maxPlayers
      ? `${gameInfo.minPlayers} players`
      : `${gameInfo.minPlayers}–${gameInfo.maxPlayers} players`;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm mb-10 transition-colors"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        ← All games
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
        {/* ── Left: game info ── */}
        <div>
          {/* Banner */}
          <div
            className="w-full aspect-video rounded-2xl mb-7 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: gameTheme?.gradient ?? 'linear-gradient(135deg, var(--color-surface-raised), var(--color-surface))' }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 25% 40%, rgba(255,255,255,0.1) 0%, transparent 55%)' }}
            />
            <span className="text-7xl relative z-10 mb-2">{gameTheme?.symbol ?? '🃏'}</span>
            <span
              className="relative z-10 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              {playerRange}
            </span>
          </div>

          <h1
            className="text-3xl font-bold tracking-tight mb-3"
            style={{ color: 'var(--color-fg)' }}
          >
            {gameInfo.displayName}
          </h1>

          {gameInfo.description && (
            <p
              className="leading-relaxed mb-6 text-sm"
              style={{ color: 'var(--color-fg-muted)', maxWidth: '48ch' }}
            >
              {gameInfo.description}
            </p>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <span
              className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-fg-muted)',
              }}
            >
              {playerRange}
            </span>
            <span
              className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-fg-muted)',
              }}
            >
              Real-time
            </span>
          </div>

          {gameInfo.rules.length > 0 && (
            <Button variant="ghost" onClick={() => setShowRules(true)}>
              How to Play
            </Button>
          )}
        </div>

        {/* ── Right: Lobby Panel ── */}
        <div className="lg:sticky lg:top-20">
          <LobbyPanel
            gameUrl={config.url}
            gameInfo={gameInfo}
            getSocket={getSocket}
            token={token}
          />
        </div>
      </div>

      {showRules && (
        <RulesModal
          gameName={gameInfo.displayName}
          rules={gameInfo.rules}
          onClose={() => setShowRules(false)}
        />
      )}
    </main>
  );
}
