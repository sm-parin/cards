# Session: 2026-04-11 — HomeScreen revamp

## Task
Revamp both BQ and JT HomeScreens to a two-column layout with a live lobby table, unified player count control, and private room verify flow. Remove inline user info bar.

## Changes

### Server
- `apps/server/src/sockets/roomHandler.js` — `handleGetLobbies` now returns ALL waiting rooms (public + private), adds `isPrivate` field to each entry, sorts by fill rate descending (playerCount/maxPlayers).

### Types
- `apps/game-black-queen/src/types/index.ts` — Added `isPrivate: boolean` to `LobbyEntry`.
- `apps/game-jack-thief/src/types/index.ts` — Same.

### Frontend (both games)
- `apps/game-black-queen/src/components/home/HomeScreen.tsx` — Full rewrite. Player range 5–10, default 5.
- `apps/game-jack-thief/src/components/home/HomeScreen.tsx` — Full rewrite. Player range 2–13, default 2.

Both HomesScreens now identical in structure, only differ in MIN_PLAYERS/MAX_PLAYERS constants.

## New layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Left (w-72, fixed)           │ Right (flex-1)                   │
│                              │ 🔍 Search... [×]                 │
│ Game title + subtitle        │ Filters: Private Public Players  │
│ [Matchmake]                  │ Sort: Most Filled ▼  Refresh     │
│ ─────────────────────────    │ ┌─────────────────────────────┐  │
│ PLAYERS                      │ │ parin's lobby  2/5   [Join]  │  │
│ [−]  [5]  [+]                │ │ alice's room   1/4  [Verify] │  │
│ ─────────── slider ──────    │ │ → input[000000][×]  [Join]   │  │
│ [Create Public Lobby]        │ └─────────────────────────────┘  │
│ [Create Private Room]        │                                   │
└──────────────────────────────┴───────────────────────────────────┘
```

## Key behaviors
- Lobbies fetched on mount via `useEffect(() => emitGetLobbies(), [])`.
- Search debounced 300ms via `useDebounce` from `@cards/hooks`. Searches lobby display name or creator name.
- Filters: Private (default on), Public (default on), Players (default off — when on, filters table to rows where `maxPlayers === playerMax`).
- Sort: Most Filled (default) / Least Filled.
- Lobby display name: `{creatorName}'s lobby` (public) or `{creatorName}'s room` (private).
- Verify flow: clicking Verify sets `verifyingRoomId`. That row shows 6-digit input + × close button + Join button. Join calls `emitJoinPrivateRoom(verifyCode)`. Only one room can be verifying at a time.
- Inline user info bar (name · coins · Logout) removed from both HomesScreens — now in the global header.
- Height: `height: calc(100dvh - 57px)` fixed on the main container to ensure proper scroll behavior with the header above.

## What a future agent needs to know
1. `handleGetLobbies` previously filtered to `!r.isPrivate` — it now returns private rooms too. The passkey is never included in the response. Users verify by typing the passkey they received out-of-band.
2. The `LobbyEntry.isPrivate` field is local to each game's `src/types/index.ts`, not in `@cards/types`. If a third game is added, add `isPrivate` there too.
3. `useDebounce` from `@cards/hooks` requires `@cards/hooks` in the game's `transpilePackages` — already present in both games' `next.config.ts`.
4. Height is computed as `calc(100dvh - 57px)` (header ~56px + 1px border). If the header height changes, update both HomeScreen files. The value is not a CSS variable.

## ADR
No new architectural decision. Skip.

## Issue record
No bug fixed. Purely feature work.
