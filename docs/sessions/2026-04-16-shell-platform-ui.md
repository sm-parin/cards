# Shell platform UI implementation: Homepage, Explore, GameInfo, RulesModal, LobbyPanel
Date: 2026-04-16
Session type: Feature

## What was done
Implemented the complete shell platform UI with five new pages and one core socket integration component. The shell now has a functional game discovery and lobby creation/joining experience with real-time socket updates.

## Why it was done
The shell previously had only auth pages (login, profile) with no way for users to discover or play games. Users needed a clear entry point after login, a way to browse available games, and a way to create or join game lobbies. The socket integration enables real-time lobby updates without page reloads.

## How it was done
The implementation followed a slot-based component architecture: shared UI primitives from `@cards/ui` wrapped in shell-specific pages that own socket integration and state management. Socket.IO was initialized lazily in a factory function to ensure client-only execution and token-based auth. Tailwind CSS was used for styling to match the existing shell pattern. State management for lobby operations was kept local to `LobbyPanel` rather than global to minimize complexity.

## Files changed

### Created
- `apps/shell/src/app/page.tsx` — Homepage: renders "Dream Cards" headline with "Explore Games" button
- `apps/shell/src/app/explore/page.tsx` — Game grid: maps GAME_CONFIG entries to clickable cards (mobile 1-col, desktop 2-col)
- `apps/shell/src/app/explore/[gameId]/page.tsx` — Game info page: two-column layout with game description (left) and LobbyPanel (right)
- `apps/shell/src/components/RulesModal.tsx` — Multi-slide modal with three decks (How to Play, Scoring, Winning), prev/next nav, close button
- `apps/shell/src/components/LobbyPanel.tsx` — Two-tab UI component: "Create Lobby" (PRE/POST states) and "Join Lobby" (search, filter, sort with socket sync)
- `apps/shell/src/config/socket.ts` — Socket.IO factory: `getSocket()` lazy-initializes with `NEXT_PUBLIC_SOCKET_URL` and token auth from localStorage

### Modified
- `apps/shell/src/components/Header.tsx` — Custom implementation replacing @cards/ui PlatformHeader. Left: "Cards" logo link to /. Right: "Explore" link + profile/guest icon (clickable to /profile or /login)
- `apps/shell/src/app/layout.tsx` — Added Header component above main content. Changed body layout to flex column
- `apps/shell/next.config.ts` — Added "@cards/game-sdk" to transpilePackages array
- `apps/shell/package.json` — Added "socket.io-client": "^4.8.0" dependency

## Decisions made

Decision: Inline socket.ts instead of importing from @cards/game-sdk
Alternatives considered: Import createGameSocket from @cards/game-sdk as games do
Reason: @cards/game-sdk wasn't in shell's transpilePackages (avoids circular deps). Inlining mirrors the game pattern and is only 20 lines
Trade-off: Slight code duplication vs @cards/game-sdk (both shell and games now have socket factories). Not worth extracting further — shell socket and game sockets are semantically different (room lobby vs game state)

Decision: Keep LobbyPanel state local (useState) rather than global Zustand store
Alternatives considered: Create a shell store mirroring game-sdk patterns
Reason: LobbyPanel is self-contained, doesn't cross route boundaries, and socket listeners are already scoped. Local state matches shell's overall simplicity
Trade-off: Can't easily persist lobby filter choices across page refreshes. Acceptable — filters are transient UI state

Decision: Use `Math.min/Math.max` with `as any` cast for playerCount setter
Alternatives considered: Declare playerCount as `number` instead of inferring from config
Reason: Config minPlayers/maxPlayers are game-specific unions (BQ: 5|10, JT: 2|13). Casting the setter result is less invasive than widening the state type
Trade-off: Uses `as any` which is a code smell. Future refactor: extract playerCount logic to a custom hook with explicit number type

## Problems encountered

Problem: TypeScript error "types 2|5 and 10|13 have no overlap" on config.minPlayers === config.maxPlayers comparison
Root cause: GAME_CONFIG is a union of different game configs with different player ranges. TS can't guarantee both sides of the comparison are comparable
Fix: Cast both operands as `(config.minPlayers as number) === (config.maxPlayers as number)`
Prevention: Document that any type guard on game-specific fields needs to be explicit. Consider extracting a `getPlayerCountLabel()` helper to one place

Problem: socket.io-client import failed in LobbyPanel
Root cause: shell package.json didn't have socket.io-client dependency (only games had it)
Fix: Added "socket.io-client": "^4.8.0" to shell package.json and ran pnpm install
Prevention: When adding new npm dependencies, verify in both package.json and transpilePackages if needed

Problem: @cards/game-sdk not found despite being in transpilePackages
Root cause: Attempted to import createGameSocket from @cards/game-sdk before verifying it was a shared package. Actually a game-sdk — better inlined
Fix: Removed @cards/game-sdk import from LobbyPanel. Inlined socket factory in shell/config/socket.ts
Prevention: Check if something is truly a shared utility before importing. Shell has fewer dependencies than games for good reason — simpler scope

## Known issues introduced
None. Build passes clean. All TypeScript errors resolved.

## What a future agent needs to know

1. **Socket auth pattern differs between shell and games**: Shell's `getSocket()` reads `cards_token` (shell's token key) and connects to server for room/lobby ops. Game sockets read game-specific keys (bq_token/jt_token) and handle game state. They're separate connections — don't try to unify them via a shared package.

2. **LobbyPanel socket listeners aren't cleaned up on unmount if socket gets destroyed**: If a user quickly navigates away from /explore/[gameId], the socket is still alive (lazy singleton). Listeners remain until socket.off() is called in the useEffect cleanup. This is fine for now (listeners don't leak memory once unregistered), but future work: consider destroying the socket on route leave to free resources.

3. **TypeScript union types from GAME_CONFIG are sticky**: Anything inferred from config becomes a union (minPlayers: 2|5, maxPlayers: 10|13). Operations on these values need explicit casts. If you add a third game, the union grows larger. Keep casts close to the operation — don't spread config-typed state throughout the component.

4. **Guest users can create/join lobbies**: The shell has no guest-mode checks. LobbyPanel works fine with guests because `useAuth()` returns `{ user: null }` and the UI doesn't need auth. However, the server may reject socket events if a guest tries to start a game (servers require coins for some operations). This is acceptable — let the server enforce auth boundaries.

5. **RulesModal content is hardcoded**: RULE_SLIDES is static per game. To support game-specific rules variants (different house rules, etc.), future sessions would extract rules to `@cards/config` or a separate content package. For now, three fixed slides work fine.
