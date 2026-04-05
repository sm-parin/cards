import { GAME_CONFIG } from "@cards/config";

export default function Home() {
  const games = Object.entries(GAME_CONFIG);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Cards Platform</h1>
          <p className="mt-2 text-gray-400">Choose a game to play</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {games.map(([key, game]) => (
            <a
              key={key}
              href={game.path}
              className="flex flex-col gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-600 hover:bg-gray-800"
            >
              <h2 className="text-lg font-semibold">{game.displayName}</h2>
              <p className="text-sm text-gray-400">{game.description}</p>
              <p className="mt-1 text-xs text-gray-500">
                {game.minPlayers}–{game.maxPlayers} players
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
