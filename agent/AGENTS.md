# AGENTS.md — Cards Platform AI Context
# Overwrite this file completely at the end of every session.
# Never append — always replace the full file.
# Goal: give AI agents complete platform context in minimum tokens.
# Last updated: 2026-04-10 — global header wired (PlatformHeader → all apps), coins fix, @cards/auth in transpilePackages

## Step 0 reading list (mandatory before any work)
1. AGENTS.md (this file)
2. docs/WRITING_GUIDE.md

## What this platform is
Multi-game card platform. Shell owns auth. Games receive JWT via URL param.
One login works across all games. Virtual coins only. No real money.
Guest mode supported: no login required, guests use `Guest_XXXX` usernames,
earn no coins, and have no persistent identity.

## Monorepo structure
```
apps/
  server/            — Express 5 + Socket.IO 4, port 5000
  shell/             — Next.js 16.2.2, port 3000
  game-black-queen/  — Next.js 16.2.2, port 3002
  game-jack-thief/   — Next.js 16.2.2, port 3003
packages/
  auth/      — login/register/token utils (@cards/auth)
  config/    — GAME_CONFIG with URLs + tokenKey (@cards/config)
  types/     — shared TS types + socket event constants (@cards/types)
  i18n/      — t() translation function + registerGameTranslations (@cards/i18n)
  hooks/     — useCountdown, useToast, useWindowFocus, useLocalStorage, useDebounce (@cards/hooks)
  theme/     — design tokens: colors, spacing, radii, typography, animation, zIndex (@cards/theme)
  ui/        — shared React components (@cards/ui)
  game-sdk/  — createGameSocket, useGameConnection, useRoom, useSelf (@cards/game-sdk)
```

## Tech stack
Shell: Next.js 16.2.2, React 19, Tailwind v4, port 3000
Games: Next.js 16.2.2, React 19, Tailwind v4, Zustand 5, socket.io-client 4.8
Server: Node.js ≥18, Express 5, Socket.IO 4.8, port 5000
Database: Neon (Postgres) + Upstash (Redis)
Deployment: Render (server, Docker) + Vercel (frontends, GitHub integration)
Build: Turborepo + pnpm workspaces

## Auth flow (read carefully — non-obvious)
1. User logs in at shell → JWT stored as `cards_token` in shell localStorage
2. Shell /launch/[gameType] appends ?token=JWT to game URL → window.location.replace()
   (replace not push — prevents back-button returning to /launch)
3. Game reads ?token= from URL → stores under game-specific key → removes from URL via replaceState
4. Game socket.ts calls io() with dynamic auth callback: (cb) => cb({ token: localStorage.getItem(tokenKey) })
5. Server verifies JWT on socket connect → sets socket.authUser = {id, username, coins}
6. If token missing/invalid → guest: { id: socket.id, username: 'Guest_XXXX', coins: 0, isGuest: true }

Auth is email + password (not username). JWT payload includes: { userId, username, email, nickname }.
`username` in DB = computed display name: `nickname ?? email.split('@')[0]`.

## Token storage keys
Shell:        `cards_token`
Black Queen:  `bq_token`
Jack Thief:   `jt_token`

## CRITICAL: Player identity rules
- player.id = stable UUID from auth. NEVER changes. Used in all game logic.
- player.socketId = current socket.id. Changes on reconnect.
- Always emit to player.socketId. NEVER to player.id.
- updatePlayerId() patches player.socketId only. Never touches player.id.
- turnOrder, highestBidder, partners all use player.id (stable) — never need patching.
- Guest players: player.id = socket.id at join time (ephemeral, no stable UUID).

## Server structure
Entry:   apps/server/src/server.js
App:     apps/server/src/app.js — CORS, bodyParser, /healthz, mounts /auth
Startup: redis.connect() → runMigrations() → http.createServer(app) → io.attach()
Auth:    JWT verified on every socket connect in sockets/index.js
         Invalid/missing token → guest mode (not disconnected).

Socket handler files:
  sockets/roomHandler.js        — PLAY_NOW, matchmaking, public lobby CRUD
  sockets/privateRoomHandler.js — CREATE/JOIN_PRIVATE_ROOM (6-digit passkey)
  sockets/gameHandler.js        — START_GAME
  sockets/biddingHandler.js     — PLACE_BID, PASS_BID
  sockets/partnerHandler.js     — SELECT_MASTER_SUIT, SELECT_PARTNER
  sockets/gameplayHandler.js    — PLAY_CARD, stack resolution, game end
  sockets/jackThiefHandler.js   — JT_START_GAME, JT_DISCARD_PAIR, JT_PICK_CARD

## Database

### Postgres tables
users             — id UUID PK, email TEXT (partial unique index WHERE NOT NULL),
                    username TEXT (computed display name, nullable), nickname TEXT, bio TEXT,
                    password TEXT NOT NULL, coins INT default 1000, created_at
matches           — id UUID PK, room_id TEXT, winner_team TEXT, bid_target INT, played_at
match_players     — (match_id, user_id) composite PK, team TEXT, coin_delta INT
coin_transactions — id UUID PK, user_id, delta INT, reason TEXT, match_id, created_at (append-only)

### Redis keys and TTLs
room:{roomId}:lobby  — lobby/waiting room state, TTL 30 minutes (1800s)
game:{roomId}:state  — active game state, TTL 2 hours (7200s)
session:{userId}     — user profile cache, TTL 24 hours

### Mid-game state rule
Card plays, bids, partner updates — in-memory ONLY. Not synced to Redis.
Redis checkpointed only at: createRoom, joinRoom, startGame, deleteRoom.

## Shared packages — exports
@cards/auth    — register(email, pass, nickname?), login(email, pass),
                 fetchMe(token) — fetch fresh user from /auth/me (returns AuthUser | null),
                 updateProfile(token, {nickname, bio}),
                 getShellToken/setShellToken/clearShellToken,
                 decodeToken(), isTokenExpired(); types: AuthUser, AuthResponse, TokenPayload
@cards/config  — GAME_CONFIG (black-queen + jack-thief entries with url/tokenKey/displayName/
                 minPlayers/maxPlayers); types: GameType, GameConfig
@cards/types   — Card (string alias), Room, RoomPlayer, PlatformUser, GamePhase, JtGamePhase,
                 CLIENT_EVENTS, SERVER_EVENTS, JT_CLIENT_EVENTS, JT_SERVER_EVENTS,
                 GameEndedPayload, JtGameEndedPayload
@cards/i18n    — t(key, interpolations?, locale?), registerGameTranslations(locale, translations);
                 type: Translations
@cards/hooks   — useCountdown, useToast (+ Toast/ToastVariant types), useWindowFocus,
                 useLocalStorage, useDebounce
@cards/theme   — colors, spacing, radii, typography, animation, zIndex (all as const objects)
@cards/ui      — Card, CardHand, PlayerSeat, TurnTimer, CoinDisplay, Toast, Button,
                 RoomPlayerList, GameLayout, PlatformHeader
                 PlatformHeader: shared header (userId, displayName, coins, shellUrl, onLogout, onAvatarClick)
                 GameLayout: slot-based game table shell (header/opponents/table/gameInfo/hand)
@cards/game-sdk — createGameSocket(tokenKey, serverUrl), getSocket(), destroySocket(),
                  useGameConnection(), useRoom<T extends Room>(), useSelf()

## Shell header
apps/shell/src/components/Header.tsx — thin wrapper around PlatformHeader.
Passes useAuth() user data + router callbacks. No custom markup.
Shell transpilePackages: @cards/ui, @cards/types, @cards/config, @cards/auth.

## Game transpilePackages
Both game next.config.ts include: @cards/types, @cards/ui, @cards/auth, @cards/i18n, @cards/hooks, @cards/theme, @cards/game-sdk.
@cards/auth ships raw TS — must be in transpilePackages of any app importing from it.
Symptom when missing: imports resolve to undefined at runtime (no build error), features silently fail.

## @cards/ui — GameLayout slot API
```tsx
<GameLayout
  header={<GameHeader />}
  opponents={/* single row of PlayerSeat components — non-self players */}
  table={/* cards played / phase panel */}
  gameInfo={/* bottom-left: phase label, bid, suit, timer */}
  hand={/* bottom-right: player's own cards */}
/>
```
Uses inline CSS only (no Tailwind) — safe for transpilePackages consumption.
Fixed overlays (notifications, flash effects) go OUTSIDE GameLayout as position:fixed.

## @cards/ui — Card component
Dark minimal design: face bg `#0f172a`, border `#1e293b`.
animate prop (default true) = mount slide-in (opacity + translateY, 250ms).
Face cards K/Q/J: large rank + crown badge (♔♕♖). Ace: oversized suit, no rank.
faceDown: diagonal stripe pattern `#1e3a5f`. Selected: gold border + glow + lift.

## Game table layout (BQ + JT)
Both games now use GameLayout. Layout: header → opponents strip → table area → bottom row.
Bottom row: gameInfo panel (220px fixed, left) + hand area (flex-1, right).
Opponents strip: single row, no wrap, overflow-x scroll, PlayerSeat per opponent.
Table area: played cards (BQ: StackTable) or pick area (JT: face-down cards when target selected).

## BQ game — key files for game screen
components/game/GameScreen.tsx          — GameLayout shell, routes phase-dependent slots
components/game/playing/OpponentsRow.tsx — PlayerSeat per opponent (isMyTurn, playedCard)
components/game/playing/GameInfoPanel.tsx — phase/bid/masterSuit/partner + TurnTimer
components/game/playing/StackTable.tsx   — current trick cards (Card from @cards/ui)
components/game/playing/Hand.tsx         — interactive hand (CardHand from @cards/ui)
components/game/PlayerHand.tsx           — static hand for bidding/partner phases

## JT game — PlayingScreen slots
opponents: PlayerSeat per non-self player, click = selectTarget when eligible
table: face-down cards of target player when pick window active; otherwise turn status
gameInfo: picker/target status text + countdown + winners list
hand: own hand with drag-rearrange + tap-pair-discard logic (Card from @cards/ui)

## Socket events (most critical with payloads)
INIT_PLAYER         client→server  {}                      triggers rejoin if player in a room
ROOM_JOINED         server→client  { room }                player joined/created a room
ROOM_UPDATE         server→client  { players }             any player list change
GAME_STARTED        server→client  { room }                BQ game begins
PLAYER_HAND         server→client  { cards: string[] }     private hand for this player
JT_PRE_GAME_STARTED server→client  { duration, hand }      40s pair-discard phase begins
JT_GAME_ENDED       server→client  { loser, winners, coinDeltas, matchId }

Full event list: packages/types/src/index.ts

## Environment variables

### Server (apps/server/.env)
PORT=5000
NODE_ENV=development
JWT_SECRET=<secret, min 32 chars in prod>
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
REDIS_URL=redis://localhost:6379           # local dev only
UPSTASH_REDIS_REST_URL=https://...        # production (triggers Upstash mode)
UPSTASH_REDIS_REST_TOKEN=<token>          # production
CORS_ORIGIN=https://shell.vercel.app,https://bq.vercel.app,https://jt.vercel.app

### Shell (apps/shell/.env.local)
NEXT_PUBLIC_API_URL=https://server.onrender.com
NEXT_PUBLIC_BLACK_QUEEN_URL=https://bq.vercel.app
NEXT_PUBLIC_JACK_THIEF_URL=https://jt.vercel.app

### Game apps (apps/game-*/.env.local)
NEXT_PUBLIC_SOCKET_URL=https://server.onrender.com
NEXT_PUBLIC_SHELL_URL=https://shell.vercel.app

## Production URLs
Server: Render — Docker container, Singapore region, free tier (sleeps after 15min inactivity)
        UptimeRobot pings /healthz every 5min to prevent cold starts
Shell:  Vercel — GitHub integration, auto-deploys on push to main
BQ:     Vercel — GitHub integration, root dir apps/game-black-queen
JT:     Vercel — GitHub integration, root dir apps/game-jack-thief

## Vercel build (all frontends)
installCommand: cd ../.. && sed -i 's/workspace://g' apps/*/package.json packages/*/package.json && npm install --legacy-peer-deps
buildCommand:   cd ../.. && npx turbo run build --filter=<app-name>
The sed is critical: strips pnpm workspace: protocol before npm install.
Must cover packages/* too — @cards/ui and @cards/game-sdk have internal workspace refs.

## Adding a new game — required steps
1. Create apps/game-{name}/ — Next.js app, assign next available port (3004+)
2. Add entry to packages/config/src/index.ts in GAME_CONFIG
3. Create apps/game-{name}/src/config/socket.ts — io() with dynamic auth callback reading tokenKey from localStorage
4. Add game-specific socket handlers in apps/server/src/sockets/{name}Handler.js
5. Register new handlers in apps/server/src/sockets/index.js onConnection()
6. Create apps/game-{name}/vercel.json — copy from game-jack-thief/vercel.json, update filter name
7. Add NEXT_PUBLIC_{NAME}_URL to shell Vercel env vars → redeploy shell
8. Add NEXT_PUBLIC_SOCKET_URL + NEXT_PUBLIC_SHELL_URL to game Vercel env vars
9. Update CORS_ORIGIN on Render to include the new game's Vercel URL → save (auto-redeploys)
10. Add new game's packages to next.config.ts transpilePackages array
11. Use GameLayout from @cards/ui for the playing screen shell
See docs/architecture/adding-a-game.md for full annotated checklist.

## Known limitations
- Mid-game state in server RAM only — server restart during active game loses all game state
- Guest players cannot rejoin after disconnect (no stable ID)
- JT game state in separate jackThiefGames Map (not room store) — deleteRoom alone is insufficient; jackThiefGames.delete(roomId) must also be called
- Only apps/server has a .env.example — no examples for shell or game apps
- No automated tests anywhere in the codebase
- @cards/auth API_URL default is localhost:3001 but server runs on 5000 — inconsistency in fallback values only; prod uses env vars so no runtime impact
- @cards/ui packages ship raw TS — tsc on game apps will show React type errors for shared packages (pre-existing, not real errors; Next.js compiles them correctly via transpilePackages)

## What NOT to do
- Never use @ts-ignore
- Never cross-import between game handler folders on server (BQ handlers must not import JT services)
- Never emit to io.to(player.id) — always use player.socketId
- Never commit .env or .env.local files
- Never put game-specific logic in shared packages
- Never modify old docs/ session files — append only, new files only
- Never use redis.keys() in hot paths — O(N) scan operation
- Never call roomStore.startGame() for JT games — JT bypasses roomStore game state
- Never use git filter-branch — use git filter-repo instead
- Never add a new @cards/* package import to a game app without adding that package to its transpilePackages in next.config.ts — it will compile but silently fail at runtime
- Never add Tailwind classes to @cards/ui components — use inline CSS from @cards/theme only
- Never put position:fixed overlays inside GameLayout — they belong outside the component tree
