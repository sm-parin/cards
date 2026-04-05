# Shared Packages

All packages live in `packages/` and are referenced as `workspace:*` in app `package.json` files. They export TypeScript source directly — no separate compile step. Next.js apps compile them via `transpilePackages` in `next.config.ts`. The server does not use TypeScript packages.

---

## @cards/auth

**Source:** `packages/auth/src/index.ts`

**What it exports:**
- `register(username, password)` — POST /auth/register, returns `{ token, user }`
- `login(username, password)` — POST /auth/login, returns `{ token, user }`
- `getShellToken()` / `setShellToken(token)` / `clearShellToken()` — localStorage access for `cards_token`
- `decodeToken(token)` — client-side JWT decode (no signature verification, base64 only)
- `isTokenExpired(token)` — checks `exp` field against `Date.now()`
- Types: `AuthUser`, `AuthResponse`, `TokenPayload`

**What it does NOT contain:**
No game-specific token keys (`bq_token`, `jt_token`) — those are hardcoded in each game's `config/socket.ts`. This package only manages the shell's `cards_token`.

**Currently imported by:**
- `apps/shell/src/context/AuthContext.tsx` — all token operations
- `apps/shell/src/app/(auth)/login/page.tsx` — login/register calls
- `apps/game-black-queen/src/app/page.tsx` — via @cards/game-sdk which re-exports decodeToken
- `packages/game-sdk/src/useSelf.ts` — decodeToken

**API_URL default mismatch:** The package defaults to `localhost:3001` if no env var is set. The server actually runs on port 5000. This only matters in local dev without env vars — production uses `NEXT_PUBLIC_API_URL`.

---

## @cards/config

**Source:** `packages/config/src/index.ts`

**What it exports:**
- `GAME_CONFIG` — object keyed by game slug with `{ displayName, minPlayers, maxPlayers, description, url, tokenKey }`
- Types: `GameType`, `GameConfig`

**What it does NOT contain:**
Server-side config, socket URLs, or any server-specific constants. It is consumed only by frontends.

**Currently imported by:**
- `apps/shell/src/app/page.tsx` — renders the game picker grid
- `apps/shell/src/app/launch/[gameType]/page.tsx` — reads game URL for redirect

**Adding a game:** Add a new entry to `GAME_CONFIG`. The shell's homepage will automatically include it in the game grid.

---

## @cards/types

**Source:** `packages/types/src/index.ts`

**What it exports:**
- Primitive: `Card` (type alias for `string`, e.g. `"Q♠"`, `"10♥"`)
- Interfaces: `Room`, `RoomPlayer`, `PlatformUser`
- Enums: `GamePhase`, `JtGamePhase`, `GameType`
- Event constants: `CLIENT_EVENTS`, `SERVER_EVENTS`, `JT_CLIENT_EVENTS`, `JT_SERVER_EVENTS` (as `const` objects)
- Payload types: `GameEndedPayload`, `JtGameEndedPayload`

**What it does NOT contain:**
Auth types (those are in `@cards/auth`). Server-side constants (those are in `apps/server/src/config/constants.js` which mirrors the event names). The server does not import this package — it maintains its own `EVENTS` and `JT_EVENTS` objects.

**The `Room` interface** is intentionally minimal so both BQ's room shape and JT's `JtRoom` shape satisfy it. `game?: unknown` allows game-specific state without typing it here.

---

## @cards/i18n

**Source:** `packages/i18n/src/index.ts` + `packages/i18n/src/locales/en.json`

**What it exports:**
- `t(key, interpolations?, locale?)` — looks up game translations first, falls back to platform translations. Warns on missing keys in non-production.
- `registerGameTranslations(locale, translations)` — merges game-specific strings into the runtime dictionary. Called at module load in each game's `page.tsx`.
- Type: `Translations`

**What it does NOT contain:**
No React context or provider. `t()` is a pure function. No dynamic locale switching — locale defaults to `'en'` and must be passed explicitly for other locales.

**Migration pattern:** Both game apps previously had a local `utils/i18n.ts`. Rather than updating dozens of component imports, that file was converted to a re-export shim. Components still `import { t } from '@/utils/i18n'` — they simply now route through `@cards/i18n` transparently.

---

## @cards/hooks

**Source:** `packages/hooks/src/`

**What it exports:**
- `useCountdown({ durationMs, onExpire? })` — 100ms interval, returns `{ remainingMs, progress, start, pause, reset }`
- `useToast()` — returns `{ toasts, addToast, removeToast }`. Toast auto-dismisses after `durationMs`.
- `useWindowFocus()` — returns boolean, listens to `focus`/`blur` events
- `useLocalStorage<T>(key, initialValue)` — SSR-safe, returns `[value, setValue, removeValue]`
- `useDebounce<T>(value, delay)` — standard debounce, returns debounced value
- Types: `Toast`, `ToastVariant`

**What it does NOT contain:**
Game-specific hooks (those live in each game's `hooks/` directory).

---

## @cards/theme

**Source:** `packages/theme/src/index.ts`

**What it exports:**
Six `as const` objects: `colors`, `spacing`, `radii`, `typography`, `animation`, `zIndex`.

Key values: `colors.accent = '#e8c84a'` (gold), `colors.bgPrimary = '#0a0a0a'` (near-black background), `colors.danger = '#f87171'`, `colors.success = '#4ade80'`.

**What it does NOT contain:**
No Tailwind config wired into game apps. Both games use Tailwind v4's CSS-first approach (`@import "tailwindcss"` + `@theme inline {}` in `globals.css`). A `packages/theme/tailwind.config.ts` exists for reference but is not consumed by any app. `@cards/ui` components use inline styles referencing theme tokens instead of Tailwind classes so they work in any consumer.

---

## @cards/ui

**Source:** `packages/ui/src/`

**What it exports:**
`Card`, `CardHand`, `PlayerSeat`, `TurnTimer`, `CoinDisplay`, `Toast`, `Button`, `RoomPlayerList`

**Card type:** Components accept `Card = string` (e.g. `"Q♠"`). The `Card` component parses rank and suit by slicing: `suit = cardStr.slice(-1)`, `rank = cardStr.slice(0, -1)`. Red suits are `♥` and `♦`.

**What it does NOT contain:**
No game-specific layout components. No components that know about game phases, bidding, or specific game rules.

**Currently imported by:**
Neither `game-black-queen` nor `game-jack-thief` currently uses `@cards/ui` components — both have their own component trees built before this package existed. Available for new games or future migration.

---

## @cards/game-sdk

**Source:** `packages/game-sdk/src/`

**What it exports:**
- `createGameSocket(tokenKey, serverUrl)` — creates/returns singleton Socket.IO client with dynamic auth callback
- `getSocket()` / `destroySocket()` — singleton access
- `useGameConnection()` — React hook, returns connection status: `'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'`
- `useRoom<T extends Room>()` — subscribes to `SERVER_EVENTS.ROOM_UPDATE`, returns room state
- `useSelf()` — decodes the stored JWT to return the current user's `AuthUser`
- Types: `GameSocket`, `ConnectionStatus`

**What it does NOT contain:**
Game-specific event handlers. No knowledge of BQ or JT game logic.

**Currently imported by:**
Neither existing game currently uses this package's socket factory. Both have working socket singletons in `config/socket.ts` that predate this package. `@cards/game-sdk` is the recommended starting point for any new game added to the platform.
