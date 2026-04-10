# Issue: Game header shows 0 coins, missing avatar
Date discovered: 2026-04-10
Date resolved: 2026-04-10
Severity: Medium
Status: Resolved

## What happened
Jack Thief (and Black Queen) game header displayed "0 coins" and showed the username as plain text with no avatar circle, while the shell header correctly showed live coin balance and avatar initials.

## Root cause
Two separate issues compounded:

1. **`@cards/auth` missing from `transpilePackages`** in both game `next.config.ts` files. The package ships raw TypeScript (`main: ./src/index.ts`). Without `transpilePackages`, Next.js cannot process it — the `fetchMe` import resolves to `undefined` at runtime. The `.then()` call on `undefined` throws silently, leaving coins at 0.

2. **Shell Header.tsx not migrated to PlatformHeader** — shell still had a bespoke implementation while game `GameHeader.tsx` files already used `PlatformHeader` from `@cards/ui`. The shell lacked the avatar circle that `PlatformHeader` provides, making the headers visually inconsistent.

## How it was found
User reported via screenshot comparison: JT showed "0 coins / parin / Logout" (no avatar), shell showed "1000 coins / [avatar] / parin / Logout".

## Fix
- `apps/game-black-queen/next.config.ts` and `apps/game-jack-thief/next.config.ts`: added `"@cards/auth"` to `transpilePackages`
- `apps/shell/src/components/Header.tsx`: replaced bespoke implementation with `PlatformHeader` from `@cards/ui`

## Why this fix and not another
The `transpilePackages` fix is the only correct solution — there is no way to use raw TypeScript workspace packages in Next.js without it. The shell Header migration was overdue; `PlatformHeader` was built specifically for this purpose and was already in use in both games.

## How to prevent recurrence
When adding a new import from any `@cards/*` workspace package to a game app, verify the package is listed in that app's `transpilePackages`. The shell's `next.config.ts` serves as the reference — it lists all packages it imports: `@cards/ui`, `@cards/types`, `@cards/config`, `@cards/auth`.
