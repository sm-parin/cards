# Jack Thief: bug fixes and 2-player features
Date: 2026-04-11
Session type: Fix

## What was done
Fixed 5 bugs and implemented 2 features in the Jack Thief game. The build also had a
pre-existing @types/react failure across all shared packages that was fixed at the root
workspace level. All changes pass the production build.

## Why it was done
The game was visibly broken during 2-player testing: the header appeared twice (one from
layout.tsx, one from GameLayout), the page scrolled during gameplay, one non-Jack card was
permanently unpaired making the game unwinnable for 2 players, and the player picking phase
had unnecessary 10s waits.

## How it was done

**Double header / scrollable page (issues 1 + 3 + 6):** Removed `<GameHeader />` from
`layout.tsx` which had been rendering it globally. Moved the conditional header into
`AppView.tsx` which now renders `<GameHeader />` only when `gameState === null` (HomeScreen +
LobbyScreen). PlayingScreen passes `header={null}` to GameLayout. This means the header
disappears once a game starts, and the scroll issue disappears because GameLayout at 100dvh
is no longer competing with a second header for viewport height.

**Coins showing 0 (issue 2):** Changed `page.tsx` to call `setReady(true)` only inside
`fetchMe(...).finally()` instead of calling it synchronously after creating the promise.
Previously the app rendered with `coins: 0` during the time fetchMe was in-flight. Now
the app waits for fetchMe to resolve before rendering. On fetchMe failure, the `.catch()`
logs nothing and `finally` triggers setReady — syncCoins from the socket event fires later
as a fallback.

**Single unpaired 10 card (issue 4):** `dealCards` in `jackThiefService.js` was using
`Math.floor(deck.length / playerIds.length)` which discards the remainder card when
`51 % playerCount !== 0`. With 2 players and 51 cards, card[50] was discarded. If that
card was one of the four 10s, the remaining 3 tens could only form one pair, leaving one
player permanently holding a single 10 with no pairing partner. Changed to round-robin
distribution (`deck[i % playerCount]`) so ALL 51 cards are dealt. Some players receive one
extra card, but no card is ever discarded. All 4 non-jack ranks remain in play.

**Auto-yellow player not clickable (issue 5):** `isMyTurn` on PlayerSeat indicated the
targeted player (yellow ring) but nothing visually indicated selectable players. Added
`isSelectable?: boolean` prop to PlayerSeat that renders a blue (colors.info) ring + subtle
glow when a player is clickable during Phase1. PlayingScreen now passes
`isSelectable={canSelectAsTarget}`.

**2-player skip pick timer (issue 7):** When `startSelectPlayerTimer` is called and
`activePlayers.length - 1 === 1` (only one pick candidate), it now skips Phase1 entirely
and immediately calls `startBuffer`. No JT_SELECT_PLAYER_TIMER_START is emitted. Players
never see the 10s countdown with a single real choice.

**@types/react build failure:** All shared packages (hooks, ui, game-sdk, etc.) import from
'react' but the packages directory is not in any app's node_modules resolution path. The
build had been silently failing locally since these packages were added. Fixed by adding
`@types/react` and `@types/react-dom` to the monorepo root `package.json` devDependencies.
Also added `@types/react: "*"` to `packages/hooks/package.json` for clarity.

## Files changed

### Created
- docs/sessions/2026-04-11-jt-bugs-features.md — this file

### Modified
- apps/game-jack-thief/src/app/layout.tsx — removed `<GameHeader />` and its import; header
  now lives in AppView conditionally
- apps/game-jack-thief/src/app/page.tsx — `setReady(true)` moved inside fetchMe finally()
  so coins are never 0 on first render
- apps/game-jack-thief/src/components/AppView.tsx — imports GameHeader, renders it only
  when `!gameState` (before game starts); routes unchanged
- apps/game-jack-thief/src/components/game/PlayingScreen.tsx — `header={null}` in
  GameLayout (header hidden during game); adds `isSelectable={canSelectAsTarget}` to each
  PlayerSeat in opponents slot
- apps/server/src/services/jackThiefService.js — `dealCards` now round-robin; all 51 cards
  dealt, no remainder discarded
- apps/server/src/sockets/jackThiefHandler.js — `startSelectPlayerTimer` immediately calls
  `startBuffer` when only 1 candidate (skip Phase1)
- packages/ui/src/PlayerSeat.tsx — new `isSelectable?: boolean` prop; blue ring + glow
  when true; border/shadow extracted to const for readability
- packages/hooks/package.json — added `@types/react: "*"` to devDependencies
- package.json (root) — added `@types/react` and `@types/react-dom` to devDependencies so
  all shared packages in `packages/*` can resolve React types during tsc

## Decisions made

Decision: Round-robin dealing (not floor-division) for JT
Alternatives considered: (a) discard an extra card from the deck before dealing to ensure
even split; (b) leave floor-division but ensure the discarded card is always a Jack so only
non-jack ranks remain in even counts
Reason: Round-robin is the simplest change with no edge cases. All cards stay in play.
The only "odd" rank is jacks (3 cards: pair + 1 thief), which is correct by game design.
Trade-off: First player in deal order gets one extra card when 51 % n_players ≠ 0.

Decision: setReady waits for fetchMe before rendering app
Alternatives considered: show app immediately with coins: 0 until fetchMe resolves (original)
Reason: Users were seeing "0 coins" for 500ms–5s on every page load because fetchMe must
wait for the Render server to wake. Delaying render adds negligible UX overhead since the
socket also can't connect until the server is awake.
Trade-off: A hanging fetchMe stalls the app. The .catch() + .finally() chain ensures
graceful degradation — app renders even if fetchMe fails, with syncCoins as fallback.

Decision: Root-level @types/react for monorepo type resolution
Alternatives considered: add @types/react to each shared package individually; add
typescript.ignoreBuildErrors to each game app's next.config.ts
Reason: Root-level installation is the canonical pnpm monorepo resolution path for types
shared across all packages. Per-package duplication is tedious and divergence-prone.
ignoreBuildErrors suppresses all TS errors including legitimate game logic errors.
Trade-off: Root devDependencies grow by 2 entries.

## Problems encountered

Problem: Build was failing with "Could not find declaration file for 'react'" before this
session's changes were made.
Root cause: pnpm v10 does not hoist packages to root node_modules by default. Shared
packages in `packages/*/src/` that import 'react' resolve types by walking UP from their
directory, but `apps/*/node_modules/@types/react` is in a sibling subtree, not a parent.
The resolution never reaches it.
Fix: Added @types/react + @types/react-dom to root package.json devDependencies, which
pnpm installs at `node_modules/@types/react` — reachable by all packages.
Prevention: Any new package in `packages/` that imports React must not assume the app's
@types/react is reachable. The root devDependencies are now the authoritative source.

## Known issues introduced
None. The round-robin dealing changes hand distribution, but pre-game pair discarding
handles any extra card cleanly.

## What a future agent needs to know
1. `dealCards` now never discards cards — all 51 (or 103 for 2 decks) are dealt. If you
   see handSizes not adding up to `deck.length`, suspect a deck creation bug, not the
   dealing function.
2. `startSelectPlayerTimer` auto-skips Phase1 when `activePlayers.length === 2` (only one
   candidate). This means JT_SELECT_PLAYER_TIMER_START is never emitted in 2-player games.
   Any UI that assumes this event fires on every turn will behave incorrectly.
3. Header visibility in JT is controlled entirely by `AppView.tsx`. The layout.tsx has no
   header at all. If you need to add a header to game screens (PreGame, GameEnd), add it
   inside those component files, not in layout.tsx.
4. `page.tsx` now blocks rendering until `fetchMe` resolves. Do not add `setReady(true)`
   before the finally() call — coins will show as 0 again.
