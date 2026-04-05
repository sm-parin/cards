# Platform Architecture Overview

## What this platform is

Cards is a multiplayer card-game platform where a central shell application owns user identity and multiple game applications share that identity. Players log in once and can launch any game without re-authenticating. Virtual coins are tracked across games. No real money is involved.

## The three layers

### Layer 1 — Shell (apps/shell)
The shell is the only application users register and log in to. It owns the JWT and coins display. Its homepage shows available games in a grid driven by `@cards/config`. When a user launches a game, the shell appends the JWT to the game's URL and navigates away using `window.location.replace()` (not push) so the launch route is excluded from browser history.

Guest users can skip login and launch games directly. The shell's launch page passes no token for guests — games detect the absence and assign a temporary identity.

### Layer 2 — Game frontends (apps/game-*)
Each game is an independent Next.js application with its own Vercel deployment. Games share no runtime state with the shell — they receive identity once via URL param and are thereafter self-contained.

Games connect to the shared server via Socket.IO. They read their token from localStorage (not from the shell) on each connection attempt, so reconnects after token refresh work without shell involvement.

Current games:
- `game-black-queen` — 5–10 player trick-taking game, port 3002
- `game-jack-thief` — 2–13 player Old Maid variant, port 3003

### Layer 3 — Server (apps/server)
A single Node.js + Express + Socket.IO server handles all games. Game engines are isolated by folder — Black Queen handlers in `sockets/gameplayHandler.js` etc., Jack Thief handlers in `sockets/jackThiefHandler.js`. They share the room store, user store, and database, but must not import across game boundaries.

The server handles both HTTP (auth endpoints) and WebSocket (game events) on the same port (5000).

## Shared packages

Eight packages in `packages/` serve different purposes:

- `@cards/auth` and `@cards/config` are consumed by all apps and the shell. They define the token contract and game registry.
- `@cards/types` is the single source of truth for socket event names and shared interfaces. Both server (via constants.js which mirrors them) and clients import from here.
- `@cards/i18n`, `@cards/hooks`, `@cards/theme`, `@cards/ui` are a UI component/utility library for game frontends. They avoid duplicating presentational logic across games.
- `@cards/game-sdk` provides socket factory and React hooks for building new games faster. Current games have working sockets predating this package; it is available for new games.

Packages export TypeScript source directly. No separate build step. Next.js compiles them via `transpilePackages` in each game's `next.config.ts`.

## Key rules that must never break

**1. Shell is the only auth surface.** No game app should have its own register/login UI. Games are consumers of tokens, not issuers.

**2. player.id is never socket.id.** Stable UUIDs come from the database. Socket IDs are ephemeral. Game logic (turn order, scoring, partner selection) always references `player.id`. The `updatePlayerId()` function in roomStore exists specifically to patch `player.socketId` on reconnect without touching `player.id`.

**3. No cross-imports between game handlers.** The server folder structure separates Black Queen and Jack Thief by handler file. A future refactor must not make one game's service depend on another's. Shared logic belongs in `services/` with a generic name.

**4. Mid-game state is in-memory only.** Redis is checkpointed at room lifecycle transitions (create, join, start, delete). Bid updates, card plays, partner selections, and turn changes are not written to Redis. This means a server restart during an active game loses game state. This is an accepted trade-off at current scale.

**5. CORS_ORIGIN must include every deployed frontend.** The server reads this as a comma-separated list from the environment variable. Adding a new game to Vercel without updating CORS_ORIGIN on Render will silently break socket connections from that game.
