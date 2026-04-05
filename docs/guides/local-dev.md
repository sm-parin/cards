# Local Development Guide

## Prerequisites

Install these before anything else:

- **Node.js** ≥ 18 — `node --version`
- **pnpm** — `npm install -g pnpm`
- **Docker Desktop** — for Postgres and Redis containers

---

## 1 — Clone and install

```bash
git clone https://github.com/sm-parin/cards.git
cd cards
pnpm install
```

pnpm reads `pnpm-workspace.yaml` and installs all packages and apps together. If you see `ERR_INVALID_THIS` or URLSearchParams errors, you may have pnpm 10 — downgrade to pnpm 9: `npm install -g pnpm@9`.

---

## 2 — Start Postgres and Redis

```bash
docker run -d --name cards-postgres \
  -e POSTGRES_USER=cards \
  -e POSTGRES_PASSWORD=cards \
  -e POSTGRES_DB=cards \
  -p 5432:5432 \
  postgres:15

docker run -d --name cards-redis \
  -p 6379:6379 \
  redis:7
```

Verify they're running: `docker ps`

If containers already exist from a previous session: `docker start cards-postgres cards-redis`

---

## 3 — Configure environment variables

### Server
Create `apps/server/.env`:
```
PORT=5000
NODE_ENV=development
JWT_SECRET=any_long_random_string_for_local_dev
DATABASE_URL=postgresql://cards:cards@localhost:5432/cards
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:3003
```

Do not set `UPSTASH_REDIS_REST_URL` — its absence triggers the local Docker Redis path.

### Shell
Create `apps/shell/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BLACK_QUEEN_URL=http://localhost:3002
NEXT_PUBLIC_JACK_THIEF_URL=http://localhost:3003
```

### Black Queen
Create `apps/game-black-queen/.env.local`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
```

### Jack Thief
Create `apps/game-jack-thief/.env.local`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
```

---

## 4 — Start the server

```bash
cd apps/server
npm run dev
```

The server runs on port 5000. On first start, it runs migrations (`CREATE TABLE IF NOT EXISTS`) and prints "Migrations complete". You should see:

```
Redis: using local Docker Redis (TCP)
Redis connected
Migrations complete
Server running on port 5000
```

If you see `ECONNREFUSED` for Redis or Postgres, the Docker containers are not running.

---

## 5 — Start the shell and games

Open three separate terminals:

```bash
# Terminal 1 — shell
cd apps/shell
pnpm dev
# → http://localhost:3000

# Terminal 2 — Black Queen
cd apps/game-black-queen
pnpm dev
# → http://localhost:3002

# Terminal 3 — Jack Thief
cd apps/game-jack-thief
pnpm dev
# → http://localhost:3003
```

You don't need to start all three — only start what you're working on.

---

## 6 — Verify everything works

1. Open `http://localhost:3000`
2. Register a new user (any username/password)
3. You should see the dashboard with game tiles
4. Click "Black Queen" → it should navigate to `http://localhost:3002/?token=...`
5. The token should disappear from the URL within a second
6. You should see the Black Queen home screen with your username

For multiplayer testing, open an incognito window and register a second account.

---

## Turborepo (optional)

To start all apps at once using Turborepo:

```bash
pnpm turbo run dev
```

This runs `dev` scripts in all apps in parallel. The output is interleaved — less readable but faster to start everything.

To build a single app:
```bash
pnpm turbo run build --filter=game-jack-thief
```

---

## Common problems

**"workspace:* not found" during install** — You're using npm instead of pnpm locally. Run `pnpm install`.

**Socket connects but player is guest unexpectedly** — Check that the game's `.env.local` has `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`. Without it the socket connects but carries no token (the shell token is at localhost:3000, not at whatever default the socket uses).

**"Cannot find module '@cards/types'"** — The package isn't compiled. Since packages export TypeScript directly, Next.js must compile them. Add the package to `transpilePackages` in the app's `next.config.ts`.

**Login succeeds but coins show as 0** — The shell's AuthContext calls `GET /auth/me` to fetch fresh coins. If `NEXT_PUBLIC_API_URL` is not set, it defaults to `localhost:3001` (wrong port). Set it to `http://localhost:5000`.

**Docker containers missing after reboot** — `docker start cards-postgres cards-redis`
