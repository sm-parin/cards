# Issue: Game headers showed 0 coins instead of live balance
Date discovered: 2026-04-10
Date resolved: 2026-04-10
Severity: High
Status: Resolved

## What happened
Both game apps (BQ and JT) displayed "0 coins" in the header regardless of the user's actual balance. The shell showed the correct balance (e.g. 1000 coins). After playing a game earning or losing coins, the mismatch persisted.

## Root cause
Both game `page.tsx` files decoded the JWT payload on mount and called `setAuthUser({ ..., coins: 0 })` — hardcoding zero as a placeholder. The JWT payload does not include coins; the only way to get the current balance is to call the server. The code never fetched from the server — it stopped at the JWT decode.

## How it was found
User report with screenshots showing "0 coins" in JT and "1000 coins" in shell for the same user.

## Fix
Added `fetchMe(token): Promise<AuthUser | null>` to `@cards/auth`. It calls `GET /auth/me` with a Bearer token and returns the full user object from the database (including current coins).

In both game `page.tsx` files:
1. JWT decode still happens first (optimistic render — no blank screen)
2. `fetchMe(token).then(fresh => { if (fresh) setAuthUser(fresh) })` runs immediately after, fire-and-forget
3. When the response arrives, authUser.coins updates and the header re-renders with the correct value

Also added `@cards/auth` to `game-jack-thief/package.json` and `game-black-queen/package.json` — the package was needed for the first time in games.

## Why this fix and not another
Alternative: Embed coins in the JWT. Rejected — JWT has 7-day lifetime; coins change on every game. Stale JWT would show wrong balance for the entire week.

Alternative: Fetch coins via Socket.IO INIT_PLAYER. Rejected — INIT_PLAYER fires after socket connect, which happens after mount. The header needs coins before socket connects. REST call on mount is simpler and independent of socket lifecycle.

## How to prevent recurrence
Never set coins: 0 from JWT decode without a subsequent server fetch. The JWT payload intentionally excludes coins — the field is omitted from the token structure as a reminder. If you see `coins: 0` hardcoded anywhere outside a guest initialization, it needs a fetchMe followup.
