# Cards Platform — Complete Guide

Everything that was built, every decision that was made, and every problem that was solved.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Monorepo Tooling — Why Turborepo + pnpm](#3-monorepo-tooling--why-turborepo--pnpm)
4. [Shared Packages](#4-shared-packages)
5. [Apps](#5-apps)
   - [server](#51-server)
   - [game-black-queen](#52-game-black-queen)
   - [shell](#53-shell)
6. [Database Layer — Neon Postgres](#6-database-layer--neon-postgres)
7. [Cache Layer — Upstash Redis](#7-cache-layer--upstash-redis)
8. [Authentication — JWT and Cross-Origin Token Passing](#8-authentication--jwt-and-cross-origin-token-passing)
9. [Real-time Layer — Socket.IO](#9-real-time-layer--socketio)
10. [Local Development](#10-local-development)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Deploying the Server — Render](#12-deploying-the-server--render)
13. [Deploying the Frontends — Vercel](#13-deploying-the-frontends--vercel)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Problems Encountered and How They Were Solved](#15-problems-encountered-and-how-they-were-solved)
16. [Infrastructure Decision Log](#16-infrastructure-decision-log)

---

## 1. Project Overview

Cards is a multiplayer card-game platform. It is designed to host multiple games under a single platform umbrella. The first (and currently only) game is **Black Queen** — a 5–10 player trick-taking card game played in real time.

The platform is split into three concerns:

| Concern | Technology | Where it runs |
|---------|-----------|---------------|
| API + real-time | Node.js + Express + Socket.IO | Render (Docker, free tier) |
| Game frontend | Next.js | Vercel |
| Platform shell | Next.js | Vercel |

Users visit the shell to see available games, click into Black Queen, log in or register, and play in real time through WebSockets.

---

## 2. Repository Layout

```
cards/                          ← monorepo root
├── apps/
│   ├── server/                 ← Node.js API + Socket.IO server
│   ├── game-black-queen/       ← Next.js app — Black Queen game UI
│   └── shell/                  ← Next.js app — platform shell (auth + game picker)
├── packages/
│   ├── auth/                   ← shared auth functions (login, register, token utils)
│   ├── config/                 ← shared GAME_CONFIG constant (game URLs, metadata)
│   ├── types/                  ← shared TypeScript types for the Black Queen game domain
│   └── ui/                     ← shared React UI components (buttons, cards, etc.)
├── package.json                ← root package — declares npm workspaces
├── pnpm-workspace.yaml         ← pnpm workspace definition
├── turbo.json                  ← Turborepo task pipeline
├── docker-compose.yml          ← local dev: Postgres + Redis containers
└── GUIDE.md                    ← this file
```

---

## 3. Monorepo Tooling — Why Turborepo + pnpm

### Why a monorepo at all?

All three apps (`server`, `game-black-queen`, `shell`) and the shared packages live together in one git repository. This means:

- One `git push` to deploy everything
- Shared packages (`@cards/types`, `@cards/config`, `@cards/ui`) are consumed directly from source — no publishing to npm required
- TypeScript types are automatically consistent across frontend and backend because they literally share the same file

### Why pnpm?

pnpm uses hard links and a content-addressable store so `node_modules` is not duplicated across workspaces. It is significantly faster and more disk-efficient than npm for monorepos. The `pnpm-workspace.yaml` file declares which directories are workspace packages:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Why Turborepo?

Turborepo is a build orchestrator purpose-built for monorepos. It solves two problems:

**1. Dependency-aware task ordering.** In `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

The `^build` directive means: before building any app, build all of its workspace dependencies first. So `@cards/types` builds before `game-black-queen` builds, automatically.

**2. Caching.** Turbo hashes source files and caches build outputs. If nothing changed in `@cards/types`, its build is skipped on the next `turbo run build`. This makes CI and local rebuilds fast.

### The `--filter` flag

When deploying individual apps to Vercel, we use:

```
npx turbo run build --filter=game-black-queen
```

This tells Turbo to build only `game-black-queen` and its transitive workspace dependencies — not the entire monorepo. Without `--filter`, Vercel would try (and fail) to build the server too.

---

## 4. Shared Packages

### `@cards/auth`

Contains all authentication logic shared between the shell and any future game that needs to call the auth API. This package exists so that the shell — the single identity owner — doesn't duplicate fetch logic across multiple apps, and so any future frontend can call `login()` or `register()` without reimplementing the REST call.

Exports:

- `login(username, password)` — calls `POST /auth/login`, returns `{ token, user }`
- `register(username, password)` — calls `POST /auth/register`, returns `{ token, user }`
- `getShellToken()` / `setShellToken()` / `clearShellToken()` — read/write the shell's `localStorage` key (`cards_token`)
- `decodeToken(token)` — base64-decodes a JWT payload without verifying the signature (client-side only, never used for security decisions)
- `isTokenExpired(token)` — checks `payload.exp * 1000 < Date.now()`

The package ships TypeScript source and requires `transpilePackages: ["@cards/auth"]` in any consuming Next.js app's `next.config.ts`.

The `API_URL` used by `login()` and `register()` resolves from `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_SERVER_URL` → `http://localhost:3001` in that order, so the same code works locally and in production without any change.

### `@cards/types`

Contains the TypeScript type definitions for the Black Queen game domain — card suits, ranks, game state shape, socket event payloads, etc. Both the server (which emits events) and the game frontend (which receives them) import from here, which guarantees both sides always agree on the shape of the data.

The package exports raw TypeScript source (no compile step). The Next.js `next.config.ts` uses `transpilePackages: ["@cards/types"]` to compile it as part of the Next.js build pipeline.

### `@cards/config`

Exports a single constant `GAME_CONFIG` — a record of every game the platform hosts, including its display name, description, player count range, the production URL where the game frontend lives, and the localStorage key the game uses for its token:

```typescript
export const GAME_CONFIG = {
  "black-queen": {
    displayName: "Black Queen",
    minPlayers: 5,
    maxPlayers: 10,
    description: "5–10 player trick-taking card game",
    url: process.env.NEXT_PUBLIC_BLACK_QUEEN_URL || "http://localhost:3002",
    tokenKey: "bq_token",
  },
};
```

The shell iterates `GAME_CONFIG` to render the game picker grid. The `url` is injected via `NEXT_PUBLIC_BLACK_QUEEN_URL` so the shell always links to the right production URL. The `tokenKey` field tells the shell which localStorage key the game uses, which matters for the cross-origin token passing mechanism described in Section 8.

### `@cards/ui`

Shared React component library. Consumed by the shell and any future game frontends to keep UI consistent without duplicating components.

---

## 5. Apps

### 5.1 Server

**Location:** `apps/server/`

The server is a plain Node.js process — no TypeScript — built with:

- **Express** for HTTP routes (auth, health check)
- **Socket.IO** for real-time game events
- **pg** (node-postgres) for Postgres
- **@upstash/redis** / **redis** for Redis (dual-mode — see Section 7)
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT signing/verification

#### Entry point — `src/server.js`

This is the true startup file. It:

1. Creates an `http.Server` wrapping the Express app
2. Attaches a `Socket.IO` server to that HTTP server (so both share port 3001)
3. Connects to Redis
4. Runs Postgres migrations
5. Listens on `process.env.PORT` (Render injects this)

#### HTTP layer — `src/app.js`

Handles CORS, body parsing, and HTTP routes. CORS origins are read from the `CORS_ORIGIN` environment variable (comma-separated list of allowed frontend URLs). This means adding a new frontend never requires a code change — just update the env var.

The health check endpoint is `/healthz` (not `/health`). This is intentional — explained in detail in Section 15.

#### Database schema — `src/db/migrate.js`

Migrations run automatically at startup using `CREATE TABLE IF NOT EXISTS`. Four tables:

| Table | Purpose |
|-------|---------|
| `users` | Accounts — UUID pk, username, bcrypt password hash, coin balance, created timestamp |
| `matches` | Completed game records — winner team, bid target, timestamp |
| `match_players` | Per-player match outcome — which match, which user, which team, coin change |
| `coin_transactions` | Full audit ledger — every coin change with reason and match ref |

The coin economy uses **atomic transactions** (`BEGIN / UPDATE / INSERT / COMMIT`) with a `ROLLBACK` on error, so coin balances are never corrupted even if the server crashes mid-operation. After any coin change, the Redis session cache for that user is invalidated so the next request fetches the fresh balance.

#### Auth — `src/routes/auth.js`

Two endpoints:

- `POST /auth/register` — validates input, bcrypt-hashes the password, inserts into `users`, returns a JWT + the public user object (no password)
- `POST /auth/login` — looks up by `LOWER(username)` (case-insensitive), verifies bcrypt hash, caches the user in Redis with a 24-hour TTL, returns a JWT

#### Socket layer — `src/sockets/`

All real-time game logic is handled here. Players connect their Socket.IO client, authenticate with their JWT, and exchange events for matchmaking, room management, bidding, gameplay, and scoring.

#### Dockerfile

```dockerfile
FROM --platform=linux/amd64 node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src/ ./src/
COPY server.js ./
EXPOSE 3001
CMD ["node", "server.js"]
```

Key decisions:
- `--platform=linux/amd64` — Render runs on x86-64 Linux; without this, Docker on an Apple Silicon Mac would build an arm64 image that Render refuses
- `--omit=dev` — only installs production dependencies, keeping the image small
- Alpine base — minimal OS, small image

---

### 5.2 game-black-queen

**Location:** `apps/game-black-queen/`

The Black Queen game UI. A Next.js app using the App Router. It handles:

1. **Token ingestion** — reads the JWT from the `?token=` URL parameter on page load, stores it under `bq_token` in localStorage, and immediately removes it from the URL (so it doesn't sit in browser history)
2. **Auth gate** — if no `bq_token` exists after the URL check, redirects to `NEXT_PUBLIC_SHELL_URL/login`
3. **Lobby** — create/join public or private rooms, matchmaking
4. **Game** — real-time card gameplay via Socket.IO (`NEXT_PUBLIC_SOCKET_URL`)

The game does **not** have its own login/register UI. Identity is always established at the shell level. The game receives the token from the shell via URL parameter — this is the cross-origin auth mechanism (see Section 8).

The Socket.IO client is a singleton instance created once in `src/config/socket.ts` and reused everywhere. It connects to `NEXT_PUBLIC_SOCKET_URL` (defaults to `http://localhost:5000` if not set).

The game state machine lives in a Zustand store. Socket events update the store, and React components render from the store. This keeps socket logic out of components entirely.

`next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["@cards/types"],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};
```

`transpilePackages` is needed because `@cards/types` ships TypeScript source, not compiled JS. Without this, Next.js would fail to process the `.ts` files in the package.

The `turbopack.root` setting expands the module resolution root to the monorepo root, so workspace packages and hoisted `node_modules` are found correctly when running locally with `next dev --turbopack`.

---

### 5.3 shell

**Location:** `apps/shell/`

The platform hub. Every user enters here first. The shell owns the entire authentication lifecycle for the platform:

- **Login/register page** (`/login`) — tab-switching form with client-side validation, calls `@cards/auth` to hit the server, stores the JWT in `localStorage` under key `cards_token`
- **Auth context** (`src/context/AuthContext.tsx`) — a React context wrapping the entire app that loads the token from localStorage on mount, exposes the current user, and provides `login()` / `logout()` functions to any descendant component
- **Dashboard** (`/`) — shows the game picker grid from `@cards/config`; redirects to `/login` if not authenticated
- **Launch route** (`/launch/[gameType]`) — the critical piece. When a user clicks a game card, they arrive here. This page reads the JWT from shell's localStorage and constructs the game URL with `?token=<jwt>` appended, then does a full `window.location.href` redirect. The game receives the token in its URL, stores it locally, and removes it from the URL bar. See Section 8 for the full explanation.
- **Header** — displays `username` and `coins`, with a logout button

The shell does not contain any game logic. Its only purpose is identity and navigation. Adding a new game requires zero code changes to the shell — only a new entry in `@cards/config`.

`next.config.ts` sets `transpilePackages: ["@cards/ui", "@cards/types", "@cards/config", "@cards/auth"]` because all consumed workspace packages ship TypeScript source.

---

## 6. Database Layer — Neon Postgres

**Service:** [Neon](https://neon.tech) — serverless Postgres
**Why Neon:** Free tier, no credit card required, serverless (no always-on cost), built-in SSL, available in Singapore region (close to our Render server in Singapore).

The connection is a standard `pg.Pool` reading `DATABASE_URL`:

```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Neon requires SSL. The connection string includes `?sslmode=require`, which `pg` honours automatically.

Migrations run at startup so there is no separate migration step to remember. The `CREATE TABLE IF NOT EXISTS` pattern is idempotent — safe to run on every deploy.

---

## 7. Cache Layer — Upstash Redis

**Service:** [Upstash](https://upstash.com) — serverless Redis over HTTP
**Why Upstash:** Render's free tier does not include a Redis instance. Upstash provides free serverless Redis accessed over HTTPS (no TCP connection needed), which works perfectly from any host including Render's free containers.

#### Dual-mode Redis client (`src/db/redis.js`)

The server detects at startup which Redis client to use:

- **Production (Upstash):** If `UPSTASH_REDIS_REST_URL` is set → uses `@upstash/redis`, which talks HTTP. No connection step needed.
- **Local dev (Docker):** If the env var is absent → uses the standard `redis` package over TCP, connecting to `redis://localhost:6379` (provided by `docker-compose.yml`).

All consumers (`userStore`, `roomStore`) import one unified interface with `get`, `set`, `del`, `exists`, `keys` — they are completely unaware of which backend is running.

Redis is used for:
- **Session caching:** After login, the public user object is cached under `session:{userId}` with a 24-hour TTL so repeated socket authentications don't hit Postgres every time
- **Room state:** Active game room data lives in Redis (fast read/write, auto-expires if server crashes mid-game)

---

## 8. Authentication — JWT and Cross-Origin Token Passing

### Why auth lives in the shell, not in each game

The naive approach would be to put a login screen inside each game. The first version of this platform did exactly that — `game-black-queen` had its own `AuthScreen.tsx` and `authApi.ts`. The problem becomes obvious the moment you think about a second game: every game would need to re-implement login, and the user would have to log in separately for each game. That is a broken user experience.

The correct model: **one identity, one login, all games**. The shell is the platform — it owns auth. Every game trusts the shell.

### The flow

```
1. User visits shell → redirected to /login if no cards_token in localStorage
2. User logs in/registers → server returns JWT
3. Shell stores JWT in localStorage under key "cards_token"
4. User clicks a game card → shell navigates to /launch/[gameType]
5. Launch page reads JWT from shell localStorage, appends it to game URL:
       https://cards-game-black-queen.vercel.app?token=eyJhbG...
6. Browser navigates to game URL (full page redirect)
7. Game page.tsx reads ?token from URL on load
8. Game stores token in its own localStorage under key "bq_token"
9. Game removes ?token from URL bar (window.history.replaceState)
10. Game socket connects with bq_token in handshake auth field
```

### Why URL parameter (not localStorage, not cookies)

The shell is at `https://cards-shell.vercel.app`. The game is at `https://cards-game-black-queen.vercel.app`. These are **different origins**. The browser's same-origin policy means:

- **localStorage is not shared across origins.** The shell cannot write to the game's localStorage and vice versa. Each origin has its own isolated storage.
- **Cookies** can be shared across subdomains (e.g., `*.cards.com`) but not across completely different domains. These are different Vercel deployment URLs, not subdomains of a single domain.
- **URL parameters** are visible to the loaded page regardless of origin. When the shell redirects to `game-url?token=...`, the game receives the URL as-is and can read `searchParams.get('token')`.

The token in the URL is short-lived — the game reads it once on load and immediately removes it from the URL with `window.history.replaceState`. It never appears in server logs (the path and query string aren't sent to the Vercel CDN edge in a way that's logged per-request in the free tier). This is a well-established pattern.

### Token storage keys

| Location | Key | Managed by |
|----------|-----|------------|
| Shell localStorage | `cards_token` | `@cards/auth` — `getShellToken()` / `setShellToken()` |
| Game localStorage | `bq_token` | `socketEmitter.ts` — `getToken()` / `setToken()` |

The game and shell each have their own copy of the token. This is intentional — they are independent origins. Logging out of the game clears `bq_token` and redirects to the shell. It does **not** clear `cards_token` — the user remains logged in to the shell. This will be unified in a future session.

### JWT details

JWTs are signed with `JWT_SECRET` using the `jsonwebtoken` library. The payload contains:

```json
{ "userId": "...", "username": "...", "iat": ..., "exp": ... }
```

Default expiry is 7 days. The secret must be a strong random value:

```bash
node -e "require('crypto').randomBytes(32).toString('hex')"
```

On the Socket.IO connection, the game sends the token in the handshake `auth` object. Server middleware verifies it on every connection — invalid or expired tokens cause immediate disconnection.

Never commit `JWT_SECRET` to git. It is injected via Render's environment variable panel.

---

## 9. Real-time Layer — Socket.IO

Socket.IO is layered on top of the same HTTP server as Express, sharing port 3001. This means only one port needs to be exposed, and CORS is configured in one place (`server.js`).

The CORS for Socket.IO reads the same `CORS_ORIGIN` env var as Express:

```javascript
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

Socket handlers are split by concern into separate files under `src/sockets/`: room management, matchmaking, partner selection, bidding, gameplay, private rooms.

---

## 10. Local Development

Prerequisites: Docker Desktop, Node.js 20+, pnpm.

```bash
# Start Postgres + Redis
docker compose up -d

# Install all workspace dependencies
pnpm install

# Run all apps in parallel (server + both Next.js apps)
pnpm dev
```

Default local ports:

| App | Port |
|-----|------|
| shell | 3000 |
| server | 5000 |
| game-black-queen | 3002 |
| Postgres (Docker) | 5432 |
| Redis (Docker) | 6379 |

The server auto-runs migrations on startup, so no manual `psql` commands are needed.

---

## 11. Deployment Architecture

```
Browser
  │
  ├──► https://cards-shell.vercel.app          (Vercel — shell)
  │         │
  │         └── links to ──►
  │
  ├──► https://cards-game-black-queen.vercel.app  (Vercel — game-black-queen)
  │         │
  │         ├── REST (auth)   ──────────────────►
  │         └── WebSocket ────────────────────►  https://cards-server-20f2.onrender.com
  │                                                        │
  │                                              ┌─────────┴──────────┐
  │                                              │                    │
  │                                         Neon Postgres       Upstash Redis
  │                                    (ap-southeast-1)      (composed-parakeet)
```

All traffic is HTTPS. The server on Render is fronted by Cloudflare (Render's edge), which terminates TLS. Vercel also handles TLS for the frontends.

---

## 12. Deploying the Server — Render

### Why Render (not Fly.io)?

We originally intended to deploy to Fly.io. Fly.io requires a credit card before any deployment — even on the free tier. We switched to Render which has a genuinely free tier with no credit card required.

### Setup steps

1. Push the repo to GitHub
2. In Render dashboard → **New Web Service** → connect GitHub repo
3. Set **Root Directory** to `apps/server`
4. Set **Runtime** to **Docker** (Render detects the `Dockerfile` automatically)
5. Add all environment variables (see Section 14)
6. Set **Health Check Path** to `/healthz`

### render.yaml

The `render.yaml` file at `apps/server/render.yaml` codifies the service configuration:

```yaml
services:
  - type: web
    name: cards-server
    runtime: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: free
    region: singapore
    healthCheckPath: /healthz
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "3001"
      - key: JWT_SECRET
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
      - key: CORS_ORIGIN
        sync: false
```

`sync: false` means Render does not manage these values — they are entered manually in the dashboard (secrets must not be in source control).

### Render free tier — important behaviour

Render's free tier **spins the container down after 15 minutes of inactivity**. The next request wakes it, but with a ~30-second cold start. To prevent this, set up [UptimeRobot](https://uptimerobot.com):

- Monitor type: HTTP(s)
- URL: `https://cards-server-20f2.onrender.com/healthz`
- Interval: 5 minutes

This keeps the server alive continuously at no cost.

---

## 13. Deploying the Frontends — Vercel

### Why Vercel?

Next.js is built by Vercel. Vercel has native support for Next.js (ISR, edge functions, image optimisation). The free hobby tier is generous enough for this project. No credit card needed.

### Why GitHub integration (not Vercel CLI)?

The Vercel CLI (`vercel deploy`) only uploads the files in the target directory. In a monorepo, if you run the CLI from `apps/game-black-queen/`, the workspace packages `@cards/types`, `@cards/config`, etc. **do not exist** in the upload — the build fails with "Cannot find module '@cards/types'".

GitHub integration clones the **entire repository**, so all workspace packages are available during the build. This is the correct deployment method for monorepos on Vercel.

### Setup per app

In Vercel dashboard → **New Project** → import GitHub repo → configure:

| Setting | Value |
|---------|-------|
| Root Directory | `apps/game-black-queen` (or `apps/shell`) |
| Framework Preset | Next.js (set via `vercel.json`) |

The `vercel.json` in each app overrides the install and build commands to run from the monorepo root:

```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && sed -i 's/workspace://g' apps/*/package.json && npm install --legacy-peer-deps",
  "buildCommand": "cd ../.. && npx turbo run build --filter=game-black-queen",
  "outputDirectory": ".next"
}
```

- `cd ../..` — moves from `apps/game-black-queen/` to the monorepo root before installing/building
- `sed -i 's/workspace://g' apps/*/package.json` — strips the pnpm-specific `workspace:` protocol from **all** apps' `package.json` files before npm runs (see Section 15 — workspace: protocol and why the glob matters)
- `npm install` — used instead of `pnpm install` (see Section 15 — pnpm ERR_INVALID_THIS)
- `--legacy-peer-deps` — suppresses npm peer dependency conflicts from Next.js 16 and React 19
- `--filter=game-black-queen` — tells Turbo to build only this app and its deps, not the whole monorepo
- `"framework": "nextjs"` — explicitly declares the framework so Vercel doesn't lose it after the `cd`

After both apps are deployed, add environment variables per Section 14, then redeploy.

---

## 14. Environment Variables Reference

### Render — cards-server (complete)

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate with: node -e "require('crypto').randomBytes(32).toString('hex')">
DATABASE_URL=postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require
UPSTASH_REDIS_REST_URL=https://<name>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
CORS_ORIGIN=https://cards-game-black-queen.vercel.app,https://cards-shell.vercel.app
```

### Vercel — cards-game-black-queen (complete)

```
NEXT_PUBLIC_SOCKET_URL=https://cards-server-20f2.onrender.com
NEXT_PUBLIC_API_URL=https://cards-server-20f2.onrender.com
NEXT_PUBLIC_SHELL_URL=https://cards-shell.vercel.app
```

`NEXT_PUBLIC_SHELL_URL` is where the game redirects when no token is found — i.e., when a user lands directly on the game URL without going through the shell.

### Vercel — cards-shell (complete)

```
NEXT_PUBLIC_API_URL=https://cards-server-20f2.onrender.com
NEXT_PUBLIC_BLACK_QUEEN_URL=https://cards-game-black-queen.vercel.app
```

`NEXT_PUBLIC_API_URL` is read by `@cards/auth` when calling `POST /auth/login` and `POST /auth/register`.

### Why `NEXT_PUBLIC_` prefix?

Next.js only inlines environment variables into the browser bundle if they are prefixed with `NEXT_PUBLIC_`. Variables without this prefix are server-side only and are `undefined` in the client. Since `SOCKET_URL`, `API_URL`, `SHELL_URL`, and `BLACK_QUEEN_URL` are all used in browser code, they must have the prefix.

### Local development

`apps/shell/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_BLACK_QUEEN_URL=http://localhost:3002
```

`apps/game-black-queen/.env.local`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
```

---

## 15. Problems Encountered and How They Were Solved

### `/health` returns 404 on Render

**Problem:** Render's free tier proxy intercepts `GET /health` at the infrastructure level and returns a 404 before the request ever reaches Express.

**Fix:** Renamed the health check endpoint from `/health` to `/healthz` in both `app.js` and `render.yaml`. Render does not intercept `/healthz`.

---

### pnpm `ERR_INVALID_THIS` / `ERR_PNPM_META_FETCH_FAIL` on Vercel

**Problem:** pnpm 10 has a bug with `URLSearchParams` in Vercel's build environment. Every `pnpm install` attempt failed with a network error before installing any packages.

**Fix:** Switched the `installCommand` in `vercel.json` from `pnpm install` to `npm install`. Added `"workspaces": ["apps/*", "packages/*"]` to the root `package.json` so npm understands the workspace structure (npm workspaces requires this; pnpm uses `pnpm-workspace.yaml` instead).

---

### `workspace:*` protocol incompatible with npm — sed only patched one app

**Problem:** The initial fix changed `workspace:*` to `*` in only the target app's `package.json` (e.g. `apps/shell/package.json`). But `npm install` processes all workspace members declared in the root `package.json` — including `apps/game-black-queen/package.json` which still contained `workspace:*`. npm aborted with `EUNSUPPORTEDPROTOCOL`.

**Fix:** Broadened the sed glob in both `vercel.json` files from a single file path to `apps/*/package.json`, stripping `workspace:` from every app before npm runs:

```bash
sed -i 's/workspace://g' apps/*/package.json
```

This is safe: `workspace:*` becomes `*`, which both npm (via workspace resolution) and pnpm accept as a valid local package reference.

---

### `workspace:*` protocol incompatible with npm — initial fix

**Problem:** pnpm uses a special `workspace:*` protocol in dependencies to reference local packages. npm does not understand this protocol and throws `EUNSUPPORTEDPROTOCOL`.

**Fix:** Changed `"workspace:*"` to `"*"` in `apps/game-black-queen/package.json` and `apps/shell/package.json`. With `"*"`, npm resolves to the local workspace package (via npm workspaces), and pnpm also accepts it.

---

### npm `ERESOLVE` peer dependency conflict

**Problem:** Next.js 15.0.0 declares React 19 RC as a peer dependency, but the apps use React 19 stable. npm's strict peer checking rejects the mismatch.

**Fix:** Added `--legacy-peer-deps` to the install command. This tells npm to use the older, more permissive peer dependency resolution algorithm, which installs despite the version mismatch.

---

### Vercel blocks deploy: "No Next.js version detected"

**Problem:** After `cd ../..` in the install command, Vercel's framework auto-detection runs in the monorepo root (not the app directory). The root has no `next` dependency, so Vercel couldn't detect it was a Next.js project.

**Fix:** Added `"framework": "nextjs"` explicitly to `vercel.json`. Vercel then skips auto-detection and trusts what `vercel.json` declares.

---

### Next.js CVE-2025-66478 blocking deployment

**Problem:** The shell app was using `next@15.0.0`, which has a critical middleware bypass vulnerability (CVE-2025-66478). Vercel hard-blocks deployment of any app with this version.

**Fix:** Upgraded shell's Next.js from `15.0.0` to `16.2.2` (matching the version already used by `game-black-queen`, which was already working).

---

### WebSocket connecting to `localhost:5000` in production

**Problem:** After deploying `game-black-queen`, the Socket.IO client was still trying to connect to `ws://localhost:5000` — the default fallback when `NEXT_PUBLIC_SOCKET_URL` is not set.

**Fix:** Added `NEXT_PUBLIC_SOCKET_URL=https://cards-server-20f2.onrender.com` and `NEXT_PUBLIC_API_URL=https://cards-server-20f2.onrender.com` to the Vercel project's environment variables, then redeployed.

---

### Vercel CLI deploy: workspace packages not found

**Problem:** Running `vercel deploy --cwd apps/game-black-queen` uploads only that subdirectory. The build then fails because `@cards/types` and `@cards/config` don't exist in the uploaded tree.

**Fix:** Abandoned CLI deployment. Switched to Vercel GitHub integration which clones the full repository, making all workspace packages available.

---

### Docker image architecture mismatch

**Problem:** Building the Docker image on an Apple Silicon Mac produces an `arm64` image. Render's servers are `amd64` (x86-64). Render refused to run the image.

**Fix:** Added `--platform=linux/amd64` to the `FROM` line in the Dockerfile. Docker then builds for the correct target architecture regardless of the host machine.

---

## 16. Infrastructure Decision Log

| Decision | Alternatives considered | Reason chosen |
|----------|------------------------|---------------|
| Render (server) | Fly.io, Railway, Heroku | Fly.io requires a credit card even for free. Railway free tier is very limited. Render free tier is usable for a hobby project with no card. |
| Neon (Postgres) | Supabase, PlanetScale, ElephantSQL | Neon free tier is generous, serverless (no idle cost), good Singapore region coverage, no card required. |
| Upstash (Redis) | Redis Cloud, Render Redis add-on | Render doesn't include Redis free. Upstash is free, HTTP-based (works from any host), no TCP port needed. |
| Vercel (frontends) | Netlify, Cloudflare Pages | Vercel has first-class Next.js support. The team that builds Next.js runs Vercel. |
| GitHub integration over Vercel CLI | Vercel CLI | CLI only uploads a subdirectory; GitHub integration clones the full repo, necessary for workspace packages. |
| npm over pnpm on Vercel | pnpm, yarn | pnpm 10 has a URLSearchParams bug in Vercel's build environment. npm works without issues. |
| `/healthz` over `/health` | `/health`, `/ping`, `/status` | Render's free tier proxy intercepts `/health` and never forwards it to Express. `/healthz` is unintercepted. |
| Dual-mode Redis client | Two separate codepaths | Avoids any code changes between dev and prod. Same interface consumed everywhere; backend is an implementation detail of `db/redis.js`. |
| `CREATE TABLE IF NOT EXISTS` migrations | Flyway, node-pg-migrate | Zero external dependencies, runs at startup automatically, idempotent — safe to run on every deploy without tracking state. |
| JWT for auth | Sessions, OAuth | JWTs are stateless — no server-side session store needed. Works naturally with Socket.IO (sent in the handshake `auth` field). Also passable across origins via URL parameter. |
| Auth owned by shell, not each game | Auth per game | Per-game login means users log in separately for every game and auth logic is duplicated. Shell-owned auth gives one identity for the entire platform — one login, access to all games. |
| URL parameter for cross-origin token | Shared subdomain cookies, OAuth PKCE, postMessage | Simplest correct approach for different-origin Vercel deployments. No server round-trip, no cookie scope complexity, no message-channel setup. Token is removed from the URL immediately via `window.history.replaceState`. |
| `sed -i apps/*/package.json` glob | Per-app sed in each vercel.json | npm install processes all workspace members, so stripping `workspace:` from only one app's package.json leaves others unpatched. The glob covers all apps in one command regardless of how many are added in future. |
