# ADR-005: Render over Fly.io for Server Hosting
Date: 2026-04-05
Status: Accepted

## Context
The game server needs always-on (or near-always-on) WebSocket hosting. Socket.IO connections are long-lived. The hosting choice was constrained to providers with a genuine free tier — the platform is in development and not yet monetized.

## Decision
Use Render with Docker deployment and UptimeRobot keepalive pings to prevent the free tier from sleeping.

## Reasoning
Render offers a free tier that does not require a payment method to create an account. The free tier sleeps after 15 minutes of inactivity but can be kept alive with external pings. For a development-phase platform where active users are rare, this is acceptable.

The Dockerfile approach gives full control over the Node.js version and runtime environment. Render's Docker deployment reads `Dockerfile` and `render.yaml` from the repository root of the service.

The health endpoint is at `/healthz` specifically because Render intercepts `/health` for its own internal liveness checks. Using `/health` would cause UptimeRobot to ping Render's built-in handler rather than the application.

## Consequences

### Positive
- No credit card required to start
- Docker deployment is portable — moving to another provider requires minimal changes
- UptimeRobot's free tier is sufficient (50 monitors, 5-minute intervals)
- Singapore region proximity to the likely user base

### Negative
- Free tier sleeps — a first WebSocket connection after 15+ minutes of inactivity will fail or time out during the cold start (~30 seconds)
- Limited RAM and CPU — not suitable for high concurrency
- UptimeRobot is a dependency; if it fails, the server sleeps

### Neutral
- The Docker build adds a compilation step that pnpm-based local dev doesn't have
- `render.yaml` ties infrastructure configuration to the repository, which is good for reproducibility

## Alternatives considered
**Fly.io** — Rejected because at the time of the decision, creating a Fly.io account for the free tier required adding a credit card. The project needed zero-cost hosting without payment information.

**Railway** — Rejected because Railway's free tier had stricter compute limits and the project needed persistent WebSocket connections without usage-based billing surprises.

**Vercel Serverless** — Rejected because serverless functions do not support persistent WebSocket connections. Socket.IO requires a stateful server process. Vercel's WebSocket support (via Edge Runtime) was not mature enough for Socket.IO's requirements.

**Self-hosted VPS (DigitalOcean, Linode)** — Rejected because even the cheapest VPS ($4-6/month) costs money. The goal was zero infrastructure cost during development.
