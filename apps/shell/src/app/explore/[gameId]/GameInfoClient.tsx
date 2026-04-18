'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, LobbyPanel, RulesModal } from '@cards/ui';
import { getSocket } from '../../../config/socket';
import { useAuth } from '../../../context/AuthContext';
import type { GameConfig, GameInfo, GameType } from '@cards/config';

interface Props {
  gameId: GameType;
  config: GameConfig;
  gameInfo: GameInfo;
}

export default function GameInfoClient({ gameId, config, gameInfo }: Props) {
  const [showRules, setShowRules] = useState(false);
  const { token } = useAuth();

  const playerRange =
    gameInfo.minPlayers === gameInfo.maxPlayers
      ? `${gameInfo.minPlayers} players`
      : `${gameInfo.minPlayers}–${gameInfo.maxPlayers} players`;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
        ← All games
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <div className="w-full aspect-video bg-linear-to-br from-blue-600 to-purple-700 rounded-xl mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white drop-shadow">{gameInfo.displayName}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{gameInfo.displayName}</h1>
          {gameInfo.description && (
            <p className="text-gray-300 leading-relaxed mb-5 text-sm">{gameInfo.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700">
              {playerRange}
            </span>
          </div>
          {gameInfo.rules.length > 0 && (
            <Button variant="ghost" onClick={() => setShowRules(true)}>How to Play</Button>
          )}
        </div>
        <div>
          <LobbyPanel gameUrl={config.url} gameInfo={gameInfo} getSocket={getSocket} token={token} />
        </div>
      </div>
      {showRules && (
        <RulesModal gameName={gameInfo.displayName} rules={gameInfo.rules} onClose={() => setShowRules(false)} />
      )}
    </main>
  );
}
