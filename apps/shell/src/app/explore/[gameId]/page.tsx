import { GAME_CONFIG, type GameType, type GameInfo } from '@cards/config';
import GameInfoClient from './GameInfoClient';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

async function fetchGameInfo(url: string, displayName: string): Promise<GameInfo> {
  try {
    const res = await fetch(`${url}/api/game-info`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Non-OK response');
    return await res.json();
  } catch {
    return {
      displayName,
      description: '',
      minPlayers: 2,
      maxPlayers: 13,
      rules: [],
    };
  }
}

export default async function GameInfoPage({ params }: PageProps) {
  const { gameId } = await params;
  const gameKey = gameId as GameType;
  const config = GAME_CONFIG[gameKey];

  if (!config) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-gray-400">Game not found</p>
      </main>
    );
  }

  const gameInfo = await fetchGameInfo(config.url, config.displayName);

  return <GameInfoClient gameId={gameKey} config={config} gameInfo={gameInfo} />;
}
