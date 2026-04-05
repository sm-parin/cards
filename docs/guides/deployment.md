# Deployment Guide

## Overview

Four services, three deployment targets:

| Service       | Platform | Method              | Auto-deploys? |
|---------------|----------|---------------------|---------------|
| Server        | Render   | Docker (Dockerfile) | Yes, on push  |
| Shell         | Vercel   | GitHub integration  | Yes, on push  |
| Black Queen   | Vercel   | GitHub integration  | Yes, on push  |
| Jack Thief    | Vercel   | GitHub integration  | Yes, on push  |

All frontends deploy from the same GitHub repository. Each Vercel project is configured with a different root directory.

---

## Server (Render)

### How it deploys
Render reads `apps/server/Dockerfile` and `render.yaml`. Every push to `main` triggers a new build and deploy. The service is Singapore region, free tier (sleeps after 15 minutes of inactivity).

### Environment variables (set in Render dashboard)
```
NODE_ENV=production
PORT=10000                          # Render assigns this port internally
JWT_SECRET=<long random string>
DATABASE_URL=<Neon connection string>
UPSTASH_REDIS_REST_URL=<Upstash URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash token>
CORS_ORIGIN=https://shell.vercel.app,https://bq.vercel.app,https://jt.vercel.app
```

Setting `UPSTASH_REDIS_REST_URL` triggers the Upstash HTTP client. Do not set `REDIS_URL` in production.

### Keepalive
Render free tier sleeps after inactivity. UptimeRobot (free account) pings `https://your-server.onrender.com/healthz` every 5 minutes. The health endpoint at `/healthz` returns `{ status: 'ok', timestamp }`. Do not change this path to `/health` — Render intercepts `/health` for its own purposes.

### Redeploying manually
Render dashboard → your service → Manual Deploy → Deploy latest commit.

### Updating CORS after adding a game
Render → service → Environment → edit `CORS_ORIGIN` → append new URL → Save Changes. Render auto-redeploys on env var changes.

---

## Frontends (Vercel)

### How builds work
Each frontend's `vercel.json` specifies:
```json
{
  "installCommand": "cd ../.. && sed -i 's/workspace://g' apps/*/package.json packages/*/package.json && npm install --legacy-peer-deps",
  "buildCommand": "cd ../.. && npx turbo run build --filter=<app-name>",
  "outputDirectory": ".next"
}
```

The `sed` command strips the `workspace:` protocol prefix from all package.json files before `npm install`. This is required because npm does not understand pnpm's workspace protocol. The glob covers both `apps/*/` and `packages/*/` — the packages directory must be included because `@cards/ui` and `@cards/game-sdk` have internal `workspace:*` references.

`--legacy-peer-deps` resolves React 19 peer dependency conflicts.

### Environment variables per app

**Shell** (Vercel project → Settings → Environment Variables):
```
NEXT_PUBLIC_API_URL             https://your-server.onrender.com
NEXT_PUBLIC_BLACK_QUEEN_URL     https://your-bq-game.vercel.app
NEXT_PUBLIC_JACK_THIEF_URL      https://your-jt-game.vercel.app
```

**Black Queen:**
```
NEXT_PUBLIC_SOCKET_URL          https://your-server.onrender.com
NEXT_PUBLIC_SHELL_URL           https://your-shell.vercel.app
```

**Jack Thief:**
```
NEXT_PUBLIC_SOCKET_URL          https://your-server.onrender.com
NEXT_PUBLIC_SHELL_URL           https://your-shell.vercel.app
```

`NEXT_PUBLIC_*` variables are inlined at build time. Changing them requires a redeploy.

### Redeploying after env var change
Vercel dashboard → project → Deployments → find latest → three-dot menu → Redeploy.

### First-time setup for a new game
1. Vercel dashboard → Add New Project
2. Import the same GitHub repository
3. Set Root Directory to `apps/game-{slug}`
4. Framework preset: Next.js
5. Add env vars (above) before clicking Deploy
6. After deploy: copy the assigned URL
7. Add `NEXT_PUBLIC_{SLUG}_URL` to the shell project → redeploy shell
8. Add the new URL to `CORS_ORIGIN` on Render → save

### Preview deployments
Vercel creates preview deployments for every pull request. These preview URLs are on a different domain than production. If you test a preview deployment, socket connections will fail because the preview URL is not in `CORS_ORIGIN`. Either add the preview URL to CORS temporarily or test against production.

---

## Deployment checklist after major changes

After any session that changes server code:
- [ ] Push to main → verify Render build succeeds (Render dashboard → Logs)
- [ ] Verify `/healthz` returns 200 after deploy

After any session that changes shell or game code:
- [ ] Push to main → verify Vercel build succeeds (Vercel dashboard → Deployments)
- [ ] Smoke test: log in, launch a game, confirm socket connects

After adding a new game:
- [ ] Create Vercel project with correct root dir and env vars
- [ ] Add game URL to shell env vars → redeploy shell
- [ ] Add game URL to Render CORS_ORIGIN → save
- [ ] Verify game tile appears on shell homepage
- [ ] Verify launch flow works end-to-end

---

## Common deployment failures

**Vercel: "workspace:* not found"**
The `sed` command in `vercel.json` did not cover all package.json files. Ensure the glob includes `packages/*/package.json`, not just `apps/*/package.json`.

**Vercel: TypeScript errors that don't appear locally**
Vercel's build runs `tsc` in strict mode via `next build`. Check that no `@ts-ignore` comments are hiding errors locally. Run `pnpm turbo run build --filter=<app>` locally to reproduce.

**Socket connects but no events received**
CORS is rejecting the connection. Check browser Network tab for a failed OPTIONS preflight request. Update `CORS_ORIGIN` on Render to include the frontend's exact URL including protocol (`https://`, not `http://`).

**Render: cold start taking > 30s**
The free tier server has slept. UptimeRobot should prevent this, but the first hit after a sleep can still be slow. Verify UptimeRobot is active and pinging `/healthz`.
