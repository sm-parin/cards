# Global PlatformHeader + Coin Freshness Fix
Date: 2026-04-10
Session type: Feature

## What was done
Created a shared `PlatformHeader` component in `@cards/ui`, adopted it across all three apps (shell, BQ, JT), and fixed a coin mismatch bug where game headers showed "0 coins" instead of the live balance.

## Why it was done
The shell and both game apps had separate header implementations that diverged over time: the shell showed an updated avatar and correct coin count, while both games showed "0 coins" and no avatar. The JT game hardcoded `coins: 0` when decoding the JWT on mount because the JWT payload does not include the latest coin balance — it only reflects the balance at token issue time. Any attempt to update header styles or add features required touching three separate files.

## How it was done
The coin bug was caused by both game apps decoding the JWT and using the payload as-is, setting `coins: 0` as a placeholder and never fetching fresh data. The fix was to add `fetchMe(token)` to `@cards/auth` — a thin wrapper around `GET /auth/me` — and call it on mount after the optimistic JWT decode. The optimistic path keeps UX fast (immediate render), the `fetchMe` overwrite corrects the coin count asynchronously.

For the shared header, `PlatformHeader` was built as a pure presentational component in `@cards/ui` using only inline CSS (no Tailwind — the package rule). Avatar color hashing and initials logic was embedded directly in the component rather than relying on the shell's `AvatarCircle`. Game `GameHeader.tsx` files became thin wrappers that read from the Zustand store and pass props down; shell `Header.tsx` reads from `useAuth`. No logic lives in `PlatformHeader` itself — it renders only what it receives.

## Files changed

### Created
- `packages/ui/src/PlatformHeader.tsx` — global header component; inline CSS, avatar with djb2-hashed color, guest/logged-in branching; no framework deps

### Modified
- `packages/auth/src/index.ts` — added `fetchMe(token)` function calling GET /auth/me; returns `AuthUser | null`
- `packages/ui/src/index.ts` — added `PlatformHeader` and `PlatformHeaderProps` exports
- `apps/game-jack-thief/package.json` — added `@cards/auth` dependency (was missing; needed for `fetchMe`)
- `apps/game-black-queen/package.json` — added `@cards/auth` dependency (same reason)
- `apps/shell/package.json` — added `@cards/ui` dependency (was missing; needed for `PlatformHeader`)
- `apps/game-jack-thief/src/app/page.tsx` — import `fetchMe`; call it after JWT decode to overwrite coins with live value
- `apps/game-black-queen/src/app/page.tsx` — same change as JT
- `apps/game-jack-thief/src/components/shared/GameHeader.tsx` — replaced manual header JSX with `<PlatformHeader>`
- `apps/game-black-queen/src/components/shared/GameHeader.tsx` — same change as JT
- `apps/shell/src/components/Header.tsx` — replaced Tailwind + AvatarCircle header with `<PlatformHeader>`

## Decisions made

Decision: Embed avatar logic in PlatformHeader rather than extracting AvatarCircle to @cards/ui
Alternatives considered: Move shell's AvatarCircle into @cards/ui as a separate export
Reason: PlatformHeader is the only consumer of avatar logic in @cards/ui; a separate export adds surface area for no benefit
Trade-off: If another shared component needs avatars in future, the logic will need extraction at that point

Decision: fetchMe is fire-and-forget (Promise.then, not await) — setReady(true) not blocked
Alternatives considered: await fetchMe before calling setReady
Reason: If server is slow or unavailable, blocking mount would show a blank screen; optimistic JWT data is always better than nothing
Trade-off: Brief flicker from "0 coins" to correct value on initial render (typically <200ms on warm Render)

Decision: shellUrl prop instead of hardcoded env var inside PlatformHeader
Alternatives considered: Read NEXT_PUBLIC_SHELL_URL inside PlatformHeader directly
Reason: @cards/ui must not couple to any specific env var name; shell passes "/" while games pass their shellUrl
Trade-off: All consumers must provide shellUrl — extra prop

## Problems encountered

Problem: Shell's package.json was missing @cards/ui
Root cause: @cards/ui was added to game packages when GameLayout was introduced, but the shell already had its own Tailwind header so no dep was added to shell at that time
Fix: Added `"@cards/ui": "workspace:*"` to shell/package.json; shell's next.config.ts already had @cards/ui in transpilePackages
Prevention: When creating a new @cards/ui export, check all consumer apps for the dep, not just the ones being actively changed

Problem: Game apps missing @cards/auth
Root cause: Games had never needed @cards/auth before — they decoded JWT manually and didn't call REST auth endpoints
Fix: Added `"@cards/auth": "workspace:*"` to both game package.json files
Prevention: When a package gains a new function needed by games, add the dep at the same time

## Known issues introduced
- Coin count does not update in real-time in the game header after a game ends. The `fetchMe` call on mount gets the pre-game balance; coinDeltas from GAME_ENDED/JT_GAME_ENDED are stored in gameState but not applied to authUser.coins. Next session: add a one-liner in the socket game-end handlers to apply the coinDelta to authUser.

## What a future agent needs to know
1. The coin freshness pattern is optimistic-then-correct: JWT decode renders instantly with coins:0 placeholder, then fetchMe overwrites. Never block mount waiting for fetchMe — the server may be cold-starting.
2. PlatformHeader knows nothing about tokens, Zustand, or Next.js router. All auth logic stays in the wrapper (GameHeader.tsx or Header.tsx). PlatformHeader is purely presentational.
3. After a game ends, the header will still show pre-game coin count. To fix this: in useSocket.ts for each game, on GAME_ENDED/JT_GAME_ENDED, call `setAuthUser({ ...authUser, coins: authUser.coins + (coinDeltas[authUser.id] ?? 0) })`. This is deliberately deferred.
