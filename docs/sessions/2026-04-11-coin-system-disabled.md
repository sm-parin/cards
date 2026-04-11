# Session: 2026-04-11 — Coin System Disabled

## Task
Comment out the entire coin system across server and all frontends. Do not delete — preserve for future re-enablement.

## Why
Coin values were mismatching (JT showing 0 coins in header, shell showing 1000). Root cause investigation deferred — system commented out until properly redesigned.

## Changes

### Server
- `apps/server/src/services/matchRecorder.js` — Commented out `coinDeltas[id] = delta` and `await updateCoins(...)`. Match recording (Postgres inserts into `matches` + `match_players`) still runs. `coinDeltas` returned is always `{}`.
- `apps/server/src/sockets/jackThiefHandler.js` — Commented out the entire coinDeltas-building block and both `updateCoins` calls in `checkAndEmitWinners`. `coinDeltas: {}` still emitted in `JT_GAME_ENDED`.

### Shared UI
- `packages/ui/src/PlatformHeader.tsx` — Commented out `{coins ?? 0} coins` span. Header still renders user avatar and name; coins line hidden.

### Frontend — Game End Screens
- `apps/game-jack-thief/src/components/game/GameEndScreen.tsx` — Commented out `coinDeltas` from destructuring; commented out coin delta spans in loser row and winners list (the `+100` / `-200` fallbacks).
- `apps/game-black-queen/src/components/game/GameEndScreen.tsx` — Commented out the entire coin delta paragraph block (`myDelta !== 0`). `myDelta` variable left declared with a comment to avoid confusion.

## What a future agent needs to know
1. All commented-out sections are marked `// COIN SYSTEM DISABLED` or `{/* COIN SYSTEM DISABLED */}` — grep for that string to find every touch point.
2. `matchRecorder.js` still writes to `matches` and `match_players` tables — match history is preserved even with coins off. When re-enabling, add `coinDeltas[id] = delta` back directly above the `match_players` insert and uncomment `updateCoins`.
3. `jackThiefHandler.js` still emits `coinDeltas: {}` in `JT_GAME_ENDED` — the frontend receives an empty object and renders nothing. Frontend is already guarded against missing coinDeltas keys.
4. `PlatformHeader.tsx` is a shared package — commenting out coins there hides it across ALL apps simultaneously (shell, BQ, JT).

## ADR
No architectural decision. Skip.

## Issue record
No bug fixed. Coin system disabled by design pending redesign.
