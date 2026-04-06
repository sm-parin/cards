# Agent Instructions
# Read this file every session (Step 0). GUIDE.md has the full historical context.

---

## INITIATE Protocol

When starting a session, run: **read all files within the agent folder for context**
Files: `agent/INSTRUCTIONS.md` (this file), `agent/GUIDE.md` (full historical doc)

---

## Agent Operating Rules

### Me Talk Style (PERMANENT)
- Short 3–6 word sentences only
- No filler, preamble, pleasantries, or narration
- Run tools first, show result, then stop
- Drop articles ("Me fix code" not "I will fix the code")

### Never Commit (PERMANENT)
- Never run `git commit` or `git push`
- Write commit message in a code block only
- User handles all commits and pushes

### Branch First
- For non-trivial changes: check current branch, work on feature branch
- Ask user before touching main

---

## Platform: Cards

Multiplayer card-game platform. Two games: **Black Queen** (trick-taking) and **Jack Thief** (Old Maid variant).

**Stack:** pnpm workspaces + Turborepo | Node.js + Express + Socket.IO (server) | Next.js App Router (frontends) | Neon Postgres | Upstash Redis | JWT auth

**Monorepo root:** `c:\Users\parin\Projects\dream\cards\`

---

## Repository Layout

```
apps/
  server/           — Express + Socket.IO (plain JS)
  game-black-queen/ — Next.js game UI (TS), port 3002
  game-jack-thief/  — Next.js game UI (TS), port 3003
  shell/            — Next.js platform shell (TS), port 3000
packages/
  auth/             — login/register/token utils (@cards/auth)
  config/           — GAME_CONFIG constant (@cards/config)
  types/            — shared TS types + socket event consts (@cards/types)
  ui/               — shared React components stub (@cards/ui)
```

---

## Auth Flow

1. User logs in at shell → JWT stored as `cards_token`
2. Shell navigates to `/launch/[gameType]` → appends `?token=<jwt>` to game URL
3. Game `page.tsx` reads `?token=` → stores as `jt_token` / `bq_token` → `replaceState` to remove from URL
4. Socket connects with token in handshake `auth` field

**Token keys:** shell=`cards_token`, BQ=`bq_token`, JT=`jt_token`

Different Vercel origins → can't share localStorage → URL param is only cross-origin option.

---

## Server — Key Files

```
src/server.js          — entry: http.Server, Socket.IO, Redis connect, migrations, listen
src/app.js             — CORS (CORS_ORIGIN env, comma-sep), /healthz (NOT /health — Render intercepts /health)
src/config/constants.js — all EVENTS, JT_EVENTS, JT_RULES, GAME_RULES
src/db/postgres.js     — pg.Pool wrapper
src/db/redis.js        — dual-mode: Upstash HTTP (prod) or TCP redis (local via UPSTASH_REDIS_REST_URL detect)
src/db/roomStore.js    — Redis write-through room store
src/store/userStore.js — register/login/getUserById/updateCoins
src/sockets/index.js   — connection auth, INIT_PLAYER, disconnect; calls registerJackThiefHandlers
src/sockets/jackThiefHandler.js — all JT game logic
src/services/jackThiefService.js — JT pure functions
```

---

## Jack Thief — Game Rules

- **Players:** 2–13. Deck: 1 (≤5 players), 2 (6–13). Remove one J♥ before dealing.
- **Pre-game (40s):** Manual pair discard only. No auto-discard at timeout (cards stay as-is).
- **Playing phase:** Turn-based picks. Turn flow:
  1. Phase 1 (10s): Picker selects target player. Auto-random on expiry.
  2. Phase 2 (5s buffer): JT_TARGET_SELECTED → buffer before pick window opens.
  3. Phase 3 (10s): Pick window open. Picker selects a card from target. Skip on expiry → turn passes to target.
- **Pair discard:** Allowed in both phases. Blocked only when player is `targetPlayerId` during active pick window (`pickTimer !== null`).
- **No auto-discard:** Picked cards always added to hand without checking pairs. Manual tap-to-select only.
- **Constraint:** If >3 active players, each picker can pick from same player at most 3 times.
- **Win:** Empty hand → winner (+100 coins). Last player holding unpaired Jack → loser (-200 coins).

---

## Jack Thief — Socket Events

### Server → Client
| Event | Payload | Notes |
|-------|---------|-------|
| JT_GAME_STARTED | `{handSizes, deckCount, duration, currentPickerId}` | room |
| JT_PLAYER_HAND | `{hand}` | private per player |
| JT_PRE_GAME_ENDED | `{handSizes, currentPickerId}` | room |
| JT_SELECT_PLAYER_TIMER_START | `{currentPickerId, duration}` | room; Phase 1 starts |
| JT_TARGET_SELECTED | `{currentPickerId, targetPlayerId, bufferDuration}` | room; Phase 2 |
| JT_PICK_TIMER_START | `{duration}` | room; Phase 3 starts |
| JT_CARD_PICKED | `{pickerId, fromPlayerId, card, paired, discardedPair, newHandSizes}` | room |
| JT_HAND_UPDATE | `{hand}` | private; sent to picker AND target after pick |
| JT_PAIR_DISCARDED | `{playerId, pair, newHandSizes}` | room |
| JT_TURN_UPDATE | `{currentPickerId, targetPlayerId}` | room |
| JT_PLAYER_WON | `{playerId, winners}` | room |
| JT_GAME_ENDED | `{loser, winners, coinDeltas, matchId}` | room |
| JT_GAME_STATE | full state | private; on reconnect via INIT_PLAYER |
| JT_ERROR | `{message}` | private |

### Client → Server
| Event | Payload |
|-------|---------|
| JT_START_GAME | `{roomId}` |
| JT_DISCARD_PAIR | `{roomId, cards: [card1, card2]}` |
| JT_SELECT_TARGET | `{roomId, targetPlayerId}` |
| JT_PICK_CARD | `{roomId, fromPlayerId, cardIndex}` |
| JT_REORDER_HAND | `{roomId, cardOrder: number[]}` |

---

## Jack Thief — Server State Shape

```js
jackThiefGames[roomId] = {
  phase: 'pre-game' | 'playing' | 'ended',
  deckCount: 1 | 2,
  hands: { [playerId]: string[] },        // private
  handSizes: { [playerId]: number },      // public
  pickCounts: { [pickerId]: { [fromId]: number } },
  preGameTimer: Timeout | null,
  selectPlayerTimer: Timeout | null,      // Phase 1 (10s)
  selectTimer: Timeout | null,            // Phase 2 (5s buffer)
  pickTimer: Timeout | null,              // Phase 3 (10s pick window)
  picking: boolean,                       // race condition mutex
  winners: string[],
  loser: string | null,
  activePlayers: string[],
  currentPickerId: string | null,
  targetPlayerId: string | null,
}
```

---

## Jack Thief — Frontend Key Files

```
src/app/page.tsx              — token ingestion, authUser init
src/components/AppView.tsx    — phase router: HomeScreen/LobbyScreen/PreGameScreen/PlayingScreen/GameEndScreen
src/store/gameStore.ts        — Zustand: authUser, room, gameState, hand
src/hooks/useSocket.ts        — all JT_SERVER_EVENTS + shared room events
src/utils/socketEmitter.ts    — emit helpers (emitJtPickCard, emitJtDiscardPair, etc.)
src/utils/cardUtils.ts        — getRank, isRed, findPairsInHand
src/config/events.ts          — re-exports JT_CLIENT_EVENTS/JT_SERVER_EVENTS from @cards/types
src/config/socket.ts          — singleton socket, auth via jt_token
src/types/index.ts            — all JT types and payloads
```

---

## Jack Thief — Frontend State (`JtGameState`)

```ts
{
  phase: 'pre-game' | 'playing' | 'ended'
  deckCount: 1 | 2
  handSizes: Record<string, number>
  winners: string[]
  loser: string | null
  activePlayers: string[]
  pickCounts: Record<string, Record<string, number>>
  duration: number
  currentPickerId: string | null
  targetPlayerId: string | null
  selectPlayerActive: boolean   // Phase 1 timer running
  bufferActive: boolean         // Phase 2 buffer running
  pickWindowActive: boolean     // Phase 3 pick window open
  coinDeltas?: Record<string, number>
  matchId?: string
}
```

---

## Shared Package Conventions

- All packages export raw TypeScript source (no compile step)
- Consumers need `transpilePackages: ["@cards/types"]` etc. in `next.config.ts`
- `@cards/types` exports: `PlatformUser`, `RoomPlayer`, `CLIENT_EVENTS`, `SERVER_EVENTS`, `JT_CLIENT_EVENTS`, `JT_SERVER_EVENTS`
- `PlatformUser`: `{ id: string; username: string; coins: number }`

---

## Deployment Conventions

- **Server:** Render (Docker, Singapore). Health: `/healthz`. Env: `CORS_ORIGIN`, `JWT_SECRET`, `DATABASE_URL`, `UPSTASH_REDIS_*`
- **Frontends:** Vercel GitHub integration (NOT CLI — CLI misses workspace packages)
- **Install command:** `cd ../.. && sed -i 's/workspace://g' apps/*/package.json && npm install --legacy-peer-deps`
- **Build command:** `cd ../.. && npx turbo run build --filter=<app-name>`
- **Local dev:** `docker compose up -d` (Postgres:5432, Redis:6379) → `pnpm install` → `pnpm dev`
- **pnpm + Vercel:** pnpm 10 has URLSearchParams bug → use npm on Vercel

---

## Coin System

- JT win: +100, JT lose: -200
- BQ win: +200, BQ lose: -50
- `updateCoins(userId, delta, reason, matchId)` in `src/store/userStore.js`
- Coins updated in DB atomically; Redis session cache invalidated after update
- Frontend: `authUser.coins` updated in `onJtGameEnded` via `coinDeltas[selfId]`

---

## Common Pitfalls

- Render intercepts `/health` → always use `/healthz`
- pnpm workspace protocol (`workspace:*`) → sed strips it before npm install
- Socket.IO auth: token in handshake `auth.token` field, not headers
- JT game state (`jackThiefGames`) is separate from room store — room store is lobby only
- `hand` (private) vs `handSizes` (public) — never broadcast actual cards
- `canSelfReorder && canDiscard` — both must be true for drag-rearrange in PlayingScreen
- Pair discard blocked: `isSelfTarget && gameState.pickWindowActive`
