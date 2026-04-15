'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GAME_CONFIG, type GameType } from '@cards/config';
import { Button } from '@cards/ui';
import RulesModal from '../../../components/RulesModal';
import LobbyPanel from '../../../components/LobbyPanel';

export default function GameInfoPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameKey = gameId as GameType;
  const config = GAME_CONFIG[gameKey];

  const [showRules, setShowRules] = useState(false);

  if (!config) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-gray-400">Game not found</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link href="/explore" className="text-gray-400 hover:text-white transition-colors mb-8 inline-block">
        ← Explore other games
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left column */}
        <div>
          {/* Game image placeholder */}
          <div className="w-full aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-6 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{config.displayName}</span>
          </div>

          {/* Game description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{config.displayName}</h2>
            <p className="text-gray-300 mb-4">{config.description}</p>
            <p className="text-gray-400">
              {(config.minPlayers as number) === (config.maxPlayers as number)
                ? `${config.minPlayers} players`
                : `${config.minPlayers}–${config.maxPlayers} players`}
            </p>
          </div>

          {/* Rules button */}
          <Button variant="ghost" onClick={() => setShowRules(true)}>
            Know the Rules!
          </Button>
        </div>

        {/* Right column: Lobby Panel */}
        <div>
          <LobbyPanel config={config} gameId={gameKey} />
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && <RulesModal gameName={config.displayName} onClose={() => setShowRules(false)} />}
    </main>
  );
}
