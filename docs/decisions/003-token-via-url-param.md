# ADR-003: JWT Passed via URL Parameter
Date: 2026-04-05
Status: Accepted

## Context
The shell owns the JWT (stored in its localStorage under `cards_token`). Game frontends are on different origins — different Vercel deployments, different domains. Browser security prevents one origin from reading another's localStorage. The shell must hand off the token to a game when the user clicks "Launch".

## Decision
The shell appends `?token={JWT}` to the game's URL, navigates using `window.location.replace()`, and the game reads and stores the token on first load, then immediately removes it from the URL via `window.history.replaceState()`.

## Reasoning
This approach works across all origins with no infrastructure changes. The token is in the URL for less than one second — only long enough for the game's initial JavaScript to execute. After removal, it does not appear in browser history, bookmarks, or subsequent navigations.

The `window.location.replace()` rather than `router.push()` ensures the shell's `/launch/[gameType]` route is not added to browser history. The back button from the game returns directly to the shell dashboard, not to the loading screen.

## Consequences

### Positive
- Zero infrastructure changes required — no backend session store, no cookies, no shared subdomain
- Works across entirely different domains (not just subdomains)
- Simple to implement and debug — the token is visible in the URL during development
- Stateless — the shell does not need to know which game a user is currently playing

### Negative
- The JWT is briefly visible in the URL; it may appear in server access logs if HTTPS is not enforced (production uses HTTPS)
- If the game page fails to load before the token is removed (JS error), the token persists in the URL
- Referrer headers from the game to any third-party service (analytics, CDN) would include the token if the page were navigated before removal

### Neutral
- The game must handle the token ingestion on every page load, not just first load (because the user might re-launch from the shell)

## Alternatives considered
**Shared subdomain cookies** — Would require all apps to share a registered domain (e.g. `shell.cards.com` and `game.cards.com`). The platform uses Vercel's default `*.vercel.app` domains, which are different second-level domains. Cookie `SameSite` policies would block cross-site access even with a custom domain in modern browsers without `SameSite=None; Secure`, which requires HTTPS everywhere including local dev.

**postMessage API** — Requires a parent/child window relationship. The shell uses `window.location.replace()` to navigate the current tab to the game; there is no separate game window to message. Opening games in a new tab would allow postMessage but complicates UX and requires the shell to keep a reference to the game window.

**Server-side session (Cookie + session store)** — Would require the server to issue a session cookie with proper CORS and `SameSite` settings. Adds server-side session state, Redis session keys, and cookie configuration complexity. The JWT approach is stateless and simpler.

**Auth code flow (short-lived code exchanged for token)** — More secure than direct token-in-URL but requires a server endpoint to exchange the code. Overkill for this use case where the token is already available and the URL window is < 1 second.
