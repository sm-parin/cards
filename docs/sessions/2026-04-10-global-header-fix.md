# Global Header Wiring + Coins Fix
Date: 2026-04-10
Session type: Fix

## What was done
Wired the existing `PlatformHeader` component (already in `@cards/ui`) to all three apps. Fixed game apps showing 0 coins by identifying a missing `@cards/auth` in their `transpilePackages` config that prevented `fetchMe` from compiling.

## Why it was done
After the game table revamp session, `PlatformHeader` was built and both game `GameHeader.tsx` files were updated to use it, but the shell's `Header.tsx` was never migrated — it kept its custom implementation. Additionally, the JT game deployed to Vercel showed 0 coins and no avatar, even though the `fetchMe` call existed in `page.tsx`. The root cause was `@cards/auth` missing from the games' `transpilePackages`, causing the import to silently fail in production builds.

## How it was done
Audited all three apps' header files against `PlatformHeader`. Found shell still had its own implementation — replaced it with `PlatformHeader` (passing `useAuth()` user and router callbacks). Then traced why coins were 0 in games despite `fetchMe` calls existing: `@cards/auth` ships raw TypeScript (`main: ./src/index.ts`), so any app importing from it must include it in `transpilePackages`. Shell already had it; both games did not. Added `@cards/auth` to both game `next.config.ts` files.

## Files changed

### Modified
- `apps/shell/src/components/Header.tsx` — replaced custom markup with `PlatformHeader`; auth data comes from `useAuth()` unchanged, logout and profile navigation passed as callbacks
- `apps/game-black-queen/next.config.ts` — added `@cards/auth` to `transpilePackages` so `fetchMe` import compiles
- `apps/game-jack-thief/next.config.ts` — same as BQ

## Decisions made

Decision: Keep `useAuth()` in shell's Header wrapper rather than moving auth logic into PlatformHeader.
Alternatives considered: Making PlatformHeader handle its own auth fetch internally.
Reason: `PlatformHeader` lives in `@cards/ui` which must be auth-agnostic. Passing data as props is the correct separation.
Trade-off: Each app must wire up its own data source, but that's intentional — games use Zustand, shell uses AuthContext.

## Problems encountered

Problem: Game apps showed 0 coins in deployed header despite `fetchMe` calls in `page.tsx`.
Root cause: `@cards/auth` missing from `transpilePackages` in game `next.config.ts`. Next.js cannot process raw TypeScript from workspace packages without this config — the import fails silently (no build error, but the module can't be resolved at runtime, so `fetchMe` is undefined and the `.then()` never fires).
Fix: Added `@cards/auth` to both game `next.config.ts`.
Prevention: Any new game app that imports from a workspace package must add that package to its `transpilePackages`. The shell's `next.config.ts` serves as the reference list.

## Known issues introduced
None.

## What a future agent needs to know
1. `@cards/auth` ships raw TypeScript — any app importing from it MUST have `"@cards/auth"` in its `transpilePackages`. If coins appear as 0 in a game after a fresh build, check `transpilePackages` first.
2. Shell's `Header.tsx` is now a thin wrapper that calls `PlatformHeader` with data from `useAuth()`. Do not add game-specific logic to it. If you need to change the header UI, change `packages/ui/src/PlatformHeader.tsx`.
3. Games' `GameHeader.tsx` pass `authUser` from Zustand (populated by `fetchMe` on mount). Coins in game headers are always fresh from server — they are NOT derived from the JWT payload.
