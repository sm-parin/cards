# Initial Platform Build — Full History
Date: 2026-04-05
Session type: Documentation

## What was done
This file documents the entire Cards platform build history across all prior sessions, up to and including the documentation bootstrap session on 2026-04-05. The platform was built incrementally: monorepo scaffolding, then the Black Queen game server and UI, then auth migration to a shell, then the Jack Thief game, then a shared package library, and finally this documentation pass. All major services are deployed and functional in production.

## Why it was done
The goal was to build a multiplayer card game platform where multiple games share a single login and player identity. Building each game as a standalone app with its own auth would duplicate infrastructure and fragment user data. A monorepo with a shell-owns-auth model allows a single codebase to support N games with one user account.

## How it was done

**Phase 1 — Monorepo scaffolding.** The repository was structured as a pnpm workspace with Turborepo for build orchestration. This allowed shared packages to be developed and consumed without publishing to npm. The choice of pnpm was later complicated by a pnpm 10 URLSearchParams bug that forced Vercel builds to use npm instead.

**Phase 2 — Black Queen server.** The game server was built in plain JavaScript (no TypeScript) using Express 5 and Socket.IO 4. The in-memory room store with Redis write-through at transitions was established as the standard pattern. Player identity was split into `player.id` (stable UUID) and `player.socketId` (ephemeral) after early bugs where reconnects broke turn order.

**Phase 3 — Black Queen UI.** A Next.js frontend for Black Queen was built with Zustand for state management. Socket.IO events were handled in a single `useSocket.ts` hook mounted once at root. A local `utils/i18n.ts` provided translations.

**Phase 4 — Auth migration to shell.** Originally each game had its own login screen. This was migrated to a dedicated shell application. The `@cards/auth` package was created. The JWT-via-URL-param mechanism was designed and implemented. The shell's `/launch/[gameType]` route became the handoff point.

**Phase 5 — Jack Thief.** A second game was added — a 2–13 player Old Maid variant (Jack Thief). This required game-specific server handlers (`jackThiefHandler.js`), a separate in-memory state Map (`jackThiefGames`), and a second Next.js frontend. The JT game differs architecturally from BQ in that it has a dedicated pre-game phase (40s pair-discard countdown) and eliminates players sequentially rather than ending all at once.

**Phase 6 — Shared package library.** Six new packages were created: `@cards/i18n`, `@cards/hooks`, `@cards/theme`, `@cards/ui`, `@cards/game-sdk`. Existing games' local `utils/i18n.ts` files were converted to re-export shims to avoid touching dozens of component imports. The package library is available for new games; existing games were not migrated to it.

**Phase 7 — Documentation.** This documentation system was created. `AGENTS.md` at the root provides AI context. `docs/` provides developer knowledge. `docs/WRITING_GUIDE.md` defines the rules for both.

## Files changed

### Created (by category)
- `apps/server/src/**` — full game server (31 files): sockets, services, db, utils, routes
- `apps/shell/src/**` — shell Next.js app: auth context, login page, header, launch route, dashboard
- `apps/game-black-queen/src/**` — BQ frontend: store, hooks, components, utils
- `apps/game-jack-thief/src/**` — JT frontend: store, hooks, components, utils
- `packages/auth/`, `packages/config/`, `packages/types/` — original shared packages
- `packages/i18n/`, `packages/hooks/`, `packages/theme/`, `packages/ui/`, `packages/game-sdk/` — shared library packages added in Phase 6
- `apps/*/vercel.json` — Vercel build config for each frontend
- `apps/server/Dockerfile`, `render.yaml` — server deployment config
- `docs/**` — this documentation system (Phase 7)
- `AGENTS.md` — AI context file (Phase 7)

### Modified (significant changes)
- `apps/server/src/sockets/index.js` — added guest mode fallback (Phase 7 bugfix); originally required valid JWT
- `apps/*/vercel.json` — extended `sed` glob from `apps/*/` to include `packages/*/` after discovering @cards/ui and @cards/game-sdk had internal workspace refs
- `apps/game-black-queen/src/app/page.tsx` — replaced redirect-to-login with guest fallback
- `apps/shell/src/app/launch/[gameType]/page.tsx` — replaced redirect-to-login with pass-through for guests; changed `router.push` to `window.location.replace` to prevent back-button returning to /launch
- `apps/shell/src/context/AuthContext.tsx` — added `/auth/me` fetch for fresh coins; added cross-tab storage event listener

## Decisions made

Decision: pnpm workspaces + Turborepo as monorepo tool
Alternatives considered: Nx, Lerna, separate repositories
Reason: Turborepo's `^build` dependency ordering is exactly what's needed for packages that game apps depend on. pnpm's workspace: protocol makes local package referencing explicit.
Trade-off: pnpm v10 has a URLSearchParams bug that broke Vercel builds, requiring npm for CI while using pnpm locally.

Decision: Shell owns auth; games receive token via URL param
Alternatives considered: Each game has its own login; shared subdomain cookies; OAuth/postMessage
Reason: URL param works across different origins with zero infrastructure changes. Shared cookies require same registered domain. postMessage requires parent/child window relationship which doesn't exist after location.replace.
Trade-off: The JWT is briefly visible in the URL (< 1 second) and could appear in server access logs. Mitigated by immediate removal via replaceState and HTTPS in production.

Decision: player.id = stable UUID, player.socketId = ephemeral
Alternatives considered: Use socket.id for everything
Reason: socket.id changes on every reconnect. Using it for turn order, partner selection, and bid tracking meant a single disconnect broke game state irreparably.
Trade-off: Added updatePlayerId() complexity; must be careful never to emit to player.id.

Decision: Game mutations in memory, Redis only at transitions
Alternatives considered: Write every game state change to Redis
Reason: Writing every bid/card-play to Redis would require making all game service functions async, restructuring the entire codebase, and significantly increasing Redis operation count. At current scale a server restart during a game is acceptable.
Trade-off: Server restart loses active game state. Guests cannot rejoin after disconnect.

Decision: Render (free tier) + UptimeRobot for server hosting
Alternatives considered: Fly.io (requires credit card), Railway (limited free tier), self-hosted VPS
Reason: Render offers a genuine free tier without requiring payment information upfront. UptimeRobot keepalive pings prevent the 15-minute sleep from affecting active games.
Trade-off: Cold starts, limited RAM, Singapore region only.

Decision: Turborepo build on Vercel using npm, not pnpm
Alternatives considered: pnpm on Vercel, Vercel's built-in monorepo support
Reason: pnpm 10 has a URLSearchParams bug that crashes during Vercel's build environment. npm handles workspaces via the root `package.json` `"workspaces"` field which already existed.
Trade-off: Two package managers in the same project (pnpm locally, npm in CI). The sed command must strip workspace: protocol before npm install.

## Problems encountered

Problem: Other player appeared in newly-created lobby after game ended
Root cause: Jack Thief's game-end handler emitted `JT_GAME_ENDED` and cleaned the `jackThiefGames` Map but did not call `deleteRoom()`. The room store still held the old room with all players. When the first player created a new public lobby, matchmaking found the stale "waiting" room and placed the new player into it.
Fix: Added `deleteRoom(roomId)` call immediately after emitting `JT_GAME_ENDED` in jackThiefHandler.js.
Prevention: Any game-end handler must clean both the game-specific state (jackThiefGames) and the shared room store.

Problem: Stale player shown in new lobby (different cause — INIT_PLAYER rejoin)
Root cause: When a disconnected player's page reloaded, INIT_PLAYER fired and found the old room in the store, triggering a REJOIN_SUCCESS. This pulled the player back into a room they had logically left by navigating away.
Fix: deleteRoom() now called immediately on game end, so there is nothing to rejoin.

Problem: Vercel build failed with workspace:* references in packages/
Root cause: The sed command in vercel.json only covered `apps/*/package.json`. @cards/ui and @cards/game-sdk have internal workspace:* references in their own package.json files, which npm cannot resolve.
Fix: Extended sed glob to `apps/*/package.json packages/*/package.json`.

## Known issues introduced
- No automated tests anywhere. Every deployment is validated manually.
- @cards/auth defaults to localhost:3001 but server runs on 5000. No runtime impact in production (env var is set) but confusing for new developers.
- Guests have no reconnect ability — if their socket drops, they lose their game session.
- JT game state (jackThiefGames Map) and the room store are two separate things that must be kept in sync on game end. Easy to forget one.

## What a future agent needs to know

1. **The sed command must cover packages/ too.** Every time a new package is created that references another workspace package, the Vercel build will fail unless `packages/*/package.json` is in the sed glob. This has already bitten us once.

2. **JT game state is in two places.** `jackThiefGames` Map (in jackThiefHandler.js) and the shared room store (db/roomStore.js). On game end, BOTH must be cleaned. Cleaning only one causes the other to persist as stale state that corrupts the next game session.

3. **Do not use window.location.href on the launch page.** The original launch page used `router.push()` then `window.location.href`. Both leave `/launch` in browser history. The correct approach is `window.location.replace()` — it replaces the current history entry so the back button skips /launch entirely.

4. **Cross-tab coin sync requires the storage event, not a polling pattern.** AuthContext listens to the `storage` event on `window`. This fires in all tabs except the one that triggered the change. The tab that logs in doesn't need the event — it already has the new state. The event is for other tabs.

5. **Guest player.id is socket.id, not a UUID.** This means guests cannot be found by findRoomByUserId() reliably after a reconnect (because socket.id changes). Do not attempt to implement guest reconnect — it requires a fundamental change to how guest identity is assigned.
