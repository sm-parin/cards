# Session: 2026-04-11 — GameLobby shared component

## Task
Extract the two nearly-identical game HomeScreen components into a single reusable `GameLobby` component in `@cards/ui`. Both HomeScreens were identical except for `MIN_PLAYERS`/`MAX_PLAYERS` constants.

## Changes

### New: `packages/ui/src/GameLobby.tsx`
Full two-column HomeScreen shell. Inline CSS only (no Tailwind) using `@cards/theme` tokens.
Exports:
- `GameLobby` component
- `LobbyEntry` interface (roomId, creatorName, playerCount, maxPlayers, isPrivate)
- `GameLobbyProps` interface

Props:
- `minPlayers`, `maxPlayers` — player count config
- `title`, `subtitle` — display strings
- `lobbies: LobbyEntry[]` — from caller's store
- `pending?: boolean` — disables buttons when true
- Label props: `matchmakeLabel`, `createPublicLabel`, `createPrivateLabel`, `loadingLabel`, `refreshLabel`
- Callbacks: `onMatchmake`, `onCreatePublicLobby(max)`, `onCreatePrivateRoom(max)`, `onJoinPublicLobby(roomId)`, `onJoinPrivateRoom(passkey)`, `onRefresh`

Internal state (fully encapsulated):
- `playerMax` — stepper + range slider
- `searchQuery` + `debouncedSearch` (via `useDebounce` from `@cards/hooks`)
- `filterPublic`, `filterPrivate`, `filterByPlayers`, `sortOrder`
- `verifyingRoomId`, `verifyCode` — private room verify flow
- `hoveredRow` — table row hover highlight (via onMouseEnter/Leave, no Tailwind needed)

### `packages/ui/src/index.ts`
Added exports:
```ts
export { GameLobby }                       from './GameLobby';
export type { GameLobbyProps, LobbyEntry } from './GameLobby';
```

### `apps/game-black-queen/src/components/home/HomeScreen.tsx`
Replaced full implementation (~305 lines) with thin wrapper (~55 lines):
- Manages `pending` state + `pendingRef` lock
- Fetches lobbies on mount via `useEffect`
- Passes all config, callbacks, and translated labels to `<GameLobby>`

### `apps/game-jack-thief/src/components/home/HomeScreen.tsx`
Same replacement. Only difference: `MIN_PLAYERS = 2`, `MAX_PLAYERS = 13`.

## Design decisions

1. **`pending` + `lock()` stays in wrapper** — `GameLobby` accepts `pending` as a prop and disables buttons, but the lock mechanism (5s auto-reset, pendingRef) belongs to the game layer where network calls are made.

2. **`LobbyEntry` defined in `@cards/ui`** — canonical type in the shared component. Both games' `types/index.ts` keep their own identical copy; TypeScript structural compatibility means no type errors.

3. **`useDebounce` as internal dep** — `@cards/hooks` is already a dependency of `@cards/ui` (`package.json`), so no new dep needed.

4. **No `t()` in shared component** — translation keys are game-specific. Labels passed as string props with sensible English fallbacks.

5. **Hover via `useState`** — `hoveredRow` state tracks which row is hovered; inline style sets `background: colors.bgSurface`. Required because Tailwind classes are not available in `@cards/ui`.

## What a future agent needs to know

1. To add a new game's HomeScreen: create a thin wrapper ~55 lines, import `GameLobby` from `@cards/ui`, pass `minPlayers`/`maxPlayers` specific to that game.
2. `LobbyEntry` from `@cards/ui` has the same fields as the game-local versions. If game stores are refactored, they can import from `@cards/ui` directly.
3. The "No rooms available" fallback text is hardcoded in `GameLobby`. To customise it, add a `noLobbiesLabel` prop.
4. `GameLobby` uses `colors.accent` (#e8c84a gold) for active chips, join links, and slider — not game-specific primary color. This is intentional for a shared platform component.
