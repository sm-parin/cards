# Adding a New Game

This is the complete ordered checklist for adding game N to the platform. Each step explains why it is required, not just what to do.

---

## Prerequisites

Before starting, decide:
- **Game slug** — kebab-case, e.g. `snap`, `go-fish`. This becomes the GAME_CONFIG key, the Vercel app name, the npm package name, and the URL path.
- **Port** — next available after 3003. At time of writing: 3004.
- **Token key** — `{short-slug}_token` stored in game's localStorage. E.g. `snap_token`.
- **Min/max players**

---

## Step 1 — Create the Next.js app

Copy `apps/game-jack-thief/` as a starting point. Rename the folder to `apps/game-{slug}/`.

Update `package.json`:
- `"name": "game-{slug}"`
- `"dev": "next dev -p {PORT}"`

Update `vercel.json`:
- Change `--filter=game-jack-thief` to `--filter=game-{slug}`

Why: Each game is a completely independent Next.js deployment. Copying JT gives you the correct `transpilePackages` setup, Tailwind v4 config, and `vercel.json` pattern already proven to build on Vercel.

---

## Step 2 — Configure the socket

In `apps/game-{slug}/src/config/socket.ts`, set the `auth` callback to read the new token key:

```ts
auth: (cb) => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('{slug}_token') ?? '')
    : '';
  cb({ token });
}
```

Why: The auth callback must be a function, not a static value. A static `auth: { token }` captures the value at module load time. The callback reads localStorage at connect time, which means reconnects after page navigation still send a valid token.

---

## Step 3 — Register in @cards/config

Add to `packages/config/src/index.ts`:

```ts
'{slug}': {
  displayName: 'Game Name',
  minPlayers: N,
  maxPlayers: N,
  description: 'One-line description',
  url: process.env.NEXT_PUBLIC_{SLUG}_URL || 'http://localhost:{PORT}',
  tokenKey: '{slug}_token',
},
```

Why: The shell reads `GAME_CONFIG` to build the game picker grid and to construct the launch URL. Without this entry, the shell will not know the game exists.

---

## Step 4 — Add server-side handlers

Create `apps/server/src/sockets/{slug}Handler.js`. Follow the pattern of `jackThiefHandler.js`:
- Export a `register{Slug}Handlers(socket, io)` function
- Keep all game-specific state in a module-level `Map` (separate from the room store)
- Define game events as constants at the top of the file or import from a new `JT_EVENTS`-style block added to `constants.js`

Also add to `packages/types/src/index.ts`:
- New `{SLUG}_CLIENT_EVENTS` and `{SLUG}_SERVER_EVENTS` const objects

Why: Game handler files must not cross-import. If BQ and JT state were in the same Map, a bug in one could corrupt the other. Module-level separation means one game's crash cannot affect the other's in-memory state.

---

## Step 5 — Register handlers in sockets/index.js

In `apps/server/src/sockets/index.js`, inside `onConnection()`:

```js
const { register{Slug}Handlers } = require('./{slug}Handler');
// ...
register{Slug}Handlers(socket, io);
```

Why: All handlers must be registered on each new socket connection. The registration call is the only coupling between `index.js` and the game handler file.

---

## Step 6 — Add transpilePackages to next.config.ts

In `apps/game-{slug}/next.config.ts`, ensure all @cards packages are listed:

```ts
transpilePackages: ['@cards/types', '@cards/auth', '@cards/config', '@cards/i18n', '@cards/hooks', '@cards/theme', '@cards/ui', '@cards/game-sdk'],
```

Why: Next.js cannot compile TypeScript from `node_modules` unless the package is listed. Without this, imports from workspace packages fail at build time with "unexpected token" or similar errors.

---

## Step 7 — Set up Vercel deployment

1. Vercel dashboard → Add New Project → import same GitHub repo
2. Root Directory: `apps/game-{slug}`
3. Framework: Next.js
4. Add env vars:
   - `NEXT_PUBLIC_SOCKET_URL` — server Render URL
   - `NEXT_PUBLIC_SHELL_URL` — shell Vercel URL
5. Deploy → note the assigned URL

Why the env vars must be set before first deploy: Next.js inlines `NEXT_PUBLIC_*` variables at build time. A build without them produces a bundle that defaults to `localhost:*`, which is useless in production. Set them before the first deploy, not after.

---

## Step 8 — Update shell env vars

In the shell's Vercel project, add:
```
NEXT_PUBLIC_{SLUG}_URL = https://game-{slug}.vercel.app
```

Then redeploy the shell (Deployments → Redeploy latest).

Why: `@cards/config` reads this env var at build time. The shell must be rebuilt to embed the new game's URL. Without a redeploy, clicking the new game tile launches `localhost:{PORT}`.

---

## Step 9 — Update Render CORS

In the server's Render environment, append the new game URL to `CORS_ORIGIN`:
```
https://shell.vercel.app,https://bq.vercel.app,https://jt.vercel.app,https://game-{slug}.vercel.app
```

Save → Render auto-redeploys.

Why: Socket.IO connections from a new origin fail silently if CORS rejects the preflight. The error appears in browser devtools as a CORS error, not a game error. This is one of the most common deployment gotchas.

---

## Step 10 — Add token ingestion to the game's page.tsx

In `apps/game-{slug}/src/app/page.tsx`, add the token ingestion pattern:

```ts
const urlToken = searchParams.get('token');
if (urlToken) {
  localStorage.setItem('{slug}_token', urlToken);
  // remove from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.toString());
}
```

Set a guest fallback when no token is present.

Why: The token must be removed from the URL immediately after reading. Leaving it in the URL means it appears in browser history, server logs, and referrer headers. It also means refreshing the page re-reads the same token from the URL instead of from localStorage, which would break if more than one game tab is open.

---

## Verification checklist

After all steps:
- [ ] `pnpm dev` starts the new game on its port without errors
- [ ] Launching from the shell opens the game with a valid token
- [ ] Guest mode (no token) opens the game without redirect or crash
- [ ] Socket connects to the server (check Network tab for WebSocket upgrade)
- [ ] CORS errors are absent in browser console
- [ ] Vercel build succeeds with 0 TypeScript errors
