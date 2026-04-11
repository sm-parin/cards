# Session: 2026-04-12 — Component audit + full extraction to @cards/ui

## Task
Audit all components in both game apps; extract every component written twice into a reusable shared component in `@cards/ui`.

## Audit findings (cross-game duplicates)

| Component | BQ | JT | Action |
|---|---|---|---|
| `GameHeader` | `shared/GameHeader.tsx` | `shared/GameHeader.tsx` | Word-for-word identical → extracted to `@cards/ui` |
| `HomeScreen` | `home/HomeScreen.tsx` | `home/HomeScreen.tsx` | Already shared via `GameLobby` (previous session) |
| `LobbyScreen` | `lobby/LobbyScreen.tsx` | `lobby/LobbyScreen.tsx` | Near-identical → extracted to `GameLobbyRoom` in `@cards/ui` |
| `PlayerList` | `lobby/PlayerList.tsx` | `lobby/PlayerList.tsx` | Identical (only type) → deleted, `RoomPlayerList` used via `GameLobbyRoom` |
| `Button` | `ui/Button.tsx` | `ui/Button.tsx` | Near-identical → deleted, `@cards/ui` Button used everywhere |

## Changes

### New: `packages/ui/src/GameHeader.tsx`
Prop-driven header component — accepts `authUser: PlatformUser | null`, `shellUrl: string`, `onLogout: () => void`.
Derives displayName internally. Renders `PlatformHeader`. No store access.

### New: `packages/ui/src/GameLobbyRoom.tsx`
Shared pre-game waiting room component. Inline CSS from `@cards/theme`. Uses `Button` and `RoomPlayerList` from the same package.
Props: `room`, `selfId`, `passkey` (pre-resolved), `playerOptions`, `minPlayersToStart`, label props, callbacks.
Derives `isCreator = room.players[0]?.id === selfId` and `canStart = playerCount >= minPlayersToStart`.
Shows passkey only when `isCreator && passkey`. Player picker chips: gold when selected, otherwise dark.

### Updated: `packages/ui/src/index.ts`
Added exports: `GameHeader`, `GameHeaderProps`, `GameLobbyRoom`, `GameLobbyRoomProps`.

### Both game `shared/GameHeader.tsx` — slimmed to thin wrappers (~15 lines each)
Read `authUser` + `setAuthUser` from Zustand. Pass to `<GameHeader from @cards/ui>`. Provide `onLogout` (clearToken + set guest). Only game-specific code: `clearToken` import from game's socketEmitter.

### Both game `lobby/LobbyScreen.tsx` — slimmed to thin wrappers (~40 lines each)
Reads room, player, roomPasskey, resetGame, setMaxPlayers from store. Resolves `passkey`. Passes all to `<GameLobbyRoom>` with game-specific labels from `t()` and callbacks.
BQ: `minPlayersToStart={room.maxPlayers}` (must be full), `playerOptions=[5..10]`, `onStart=emitStartGame`
JT: `minPlayersToStart={2}`, `playerOptions=[2..13]`, `onStart=emitJtStartGame`

### Both game `lobby/PlayerList.tsx` — deleted
Replaced entirely by `RoomPlayerList` rendered inside `GameLobbyRoom`.

### Both game `ui/Button.tsx` — deleted
All game files now import `{ Button }` from `@cards/ui`. Variant "outline" → "secondary" throughout.
Files updated: BQ GameEndScreen, BidControls (+ outline→secondary), PartnerCardSelector; JT GameEndScreen.

## Design decisions

1. **`GameHeader` is prop-only** — No store access in the shared component. Each game's thin wrapper handles the store connection. This makes `GameHeader` testable and portable.

2. **passkey pre-resolved in wrapper** — The wrapper knows about `roomPasskey` from the store (`room.passkey ?? roomPasskey`). `GameLobbyRoom` just receives the final value and shows it if `isCreator`.

3. **Button variant mapping** — game "outline" → `@cards/ui` "secondary". Colors change: primary is gold (not game green/red). Consistent with `GameLobby` which already uses gold primary.

4. **`minPlayersToStart` makes BQ/JT differ** — BQ requires full room (`=room.maxPlayers`); JT requires ≥2. This single prop absorbs the main logic difference between the two screens.

## What a future agent needs to know

1. No game-local `Button`, `PlayerList`, `GameHeader`, `LobbyScreen` implementation should ever be created. Use `@cards/ui`.
2. Adding a new game: wrap `GameLobby` for HomeScreen, wrap `GameLobbyRoom` for LobbyScreen. No reimplementation needed.
3. `GameLobbyRoom` passkey prop should be `room.isPrivate ? (room.passkey ?? roomPasskey) : null` from the wrapper.
4. Both game `shared/GameHeader.tsx` wrappers are still there (as thin wrappers) because they need Zustand store access — that's correct and intentional.

---

# Exchange 2 — Non-component src/ deduplication

## Task
"Do the same for any other files within /src of both the games."

## Audit findings

| File | Action |
|---|---|
| `config/socket.ts` × 2 | `createGameSocket` already in `@cards/game-sdk` — both now use it (3 lines each) |
| `utils/socketEmitter.ts` × 2 | 12 shared fns → `createRoomEmitters` factory in `@cards/game-sdk`; games keep game-specific emitters |
| `utils/cardUtils.ts` × 2 | `getSuit`, `getValue`/`getRank`, `isRed` → `@cards/ui`; games keep `getValidCards` (BQ) / `findPairsInHand` (JT) |
| `types/index.ts` × 2 | `Suit`, `Card`, `RoomStatus`, `LobbyEntry`, `LobbiesListPayload`, `PrivateRoomCreatedPayload` → `@cards/types`; re-exported from game types |
| `utils/i18n.ts` × 2 | Already shim re-exports of `@cards/i18n` — skip |
| `config/events.ts` × 2 | Thin re-export shims — skip |
| `app/page.tsx` × 2 | Skip — behaviors differ between BQ/JT; would need `next` peer dep in shared packages |
| `store/gameStore.ts` × 2 | Skip — complex Zustand generics, high refactor risk, ~40% overlap |
| `hooks/useSocket.ts` × 2 | Skip — first ~30% shared room handlers but too tangled to extract cleanly |

## Changes

### New: `packages/ui/src/cardUtils.ts`
`getSuit`, `getValue`, `getRank` (alias for getValue), `isRed`. Uses `Card` and `Suit` from `@cards/types`.

### New: `packages/game-sdk/src/roomEmitters.ts`
`createRoomEmitters(socket, tokenKey, defaultMaxPlayers=5) → RoomEmitters` — factory that returns 12 shared functions:
- Token management: `getToken`, `setToken`, `clearToken`
- Room/lobby emitters: `emitInitPlayer`, `emitPlayNow`, `emitCreatePrivateRoom`, `emitJoinPrivateRoom`, `emitUpdateMaxPlayers`, `emitLeaveRoom`, `emitGetLobbies`, `emitCreatePublicLobby`, `emitJoinPublicLobby`

### Updated: `packages/types/src/index.ts`
Added: `Suit`, `RoomStatus`, `LobbyEntry`, `LobbiesListPayload`, `PrivateRoomCreatedPayload`.

### Updated: `packages/ui/src/GameLobby.tsx`
Removed local `LobbyEntry` definition; now imports from `@cards/types` and re-exports with `export type { LobbyEntry }`.

### Updated: `packages/ui/src/index.ts`
Added: `getSuit`, `getValue`, `getRank`, `isRed` from `./cardUtils`.

### Updated: `packages/game-sdk/src/index.ts`
Added: `createRoomEmitters`, `RoomEmitters`.

### Both game `config/socket.ts` — replaced
```ts
import { createGameSocket } from '@cards/game-sdk';
import { appConfig } from '@/config';
const socket = createGameSocket('bq_token'|'jt_token', appConfig.socketUrl);
export default socket;
```

### Both game `utils/socketEmitter.ts` — slimmed
Shared 12 fns from `createRoomEmitters`; BQ keeps `emitStartGame/emitPlaceBid/emitPassBid/emitSelectMasterSuit/emitSelectPartner/emitPlayCard`; JT keeps `emitJtStartGame/emitJtDiscardPair/emitJtPickCard/emitJtSelectTarget/emitJtReorderHand`.

### Both game `utils/cardUtils.ts` — slimmed
Re-export `getSuit/getValue/getRank/isRed` from `@cards/ui`; keep game-specific (`getValidCards` in BQ, `findPairsInHand` in JT).

### Both game `types/index.ts` — cleaned
Removed local definitions of `Suit`, `Card`, `RoomStatus`, `LobbyEntry`, `LobbiesListPayload`, `PrivateRoomCreatedPayload`. Re-exported from `@cards/types`.

## Design decisions

1. **`createRoomEmitters` in `@cards/game-sdk`, not `@cards/ui`** — socket logic belongs with other socket infrastructure, not in the UI package. game-sdk already imports from `@cards/types` and has `createGameSocket`.

2. **`socket` parameter typed as `{ emit: (event, ...args) => void }`** — duck-typed `MinSocket` avoids importing `Socket` from `socket.io-client` in `@cards/game-sdk` while still being type-safe for all callers.

3. **Re-export pattern for game types** — `export type { ... } from "@cards/types"` preserves the existing public API for any game code that imports from `@/types`. No consumer changes needed.

## What a future agent needs to know

1. `config/socket.ts` is always 3 lines — just `createGameSocket` + export.
2. `socketEmitter.ts` = `createRoomEmitters` destructured first, then game-specific emitters. Never write the 12 shared functions by hand.
3. `cardUtils.ts` = shared from `@cards/ui` + one game-specific function. Never redefine `getSuit`/`getValue`/`getRank`/`isRed`.
4. `types/index.ts` shared primitives (`Suit`, `Card`, `RoomStatus`, `LobbyEntry`, `LobbiesListPayload`, `PrivateRoomCreatedPayload`) all come from `@cards/types`. Do not re-define them.
