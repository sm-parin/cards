# ADR-002: Shell Owns Auth
Date: 2026-04-05
Status: Accepted

## Context
The platform hosts multiple games. Each game is a separate Next.js deployment. Without a centralized auth surface, each game would need its own register/login UI, its own JWT issuance, and its own user store. This creates fragmentation: a user playing Black Queen and Jack Thief would have different accounts, different coin balances, and no shared identity.

The alternative — one shared login that persists across games — requires deciding where auth lives and how games access it.

## Decision
All user registration and login happens exclusively in the shell application. Games are consumers of tokens only — they never issue them.

## Reasoning
Centralizing auth in the shell means there is exactly one place where passwords are handled, one place where JWTs are signed, and one user table. Adding a new game to the platform does not require re-implementing auth — the new game simply reads the token it receives from the shell.

This also means coins are a platform-level concept, not per-game. A player's earnings from Black Queen affect their balance when they play Jack Thief.

## Consequences

### Positive
- One login works across all games
- New games are auth-free by default — they receive identity, they don't manage it
- Single user table in Postgres; no joins needed to aggregate user data across games
- Security surface is minimal — only the shell handles passwords

### Negative
- Games cannot function without the shell existing and being deployed
- A user who navigates directly to a game URL (not via the shell) must interact as a guest or manually obtain a token
- The shell must be redeployed whenever a new game is added (to update GAME_CONFIG URLs)

### Neutral
- All auth-related bugs and security issues are concentrated in one codebase, which is both a single point of failure and a single point of attention

## Alternatives considered
**Each game has its own auth** — Rejected because it duplicates code, fragments user identity, and means users have different balances per game. The first game built (Black Queen) originally had its own AuthScreen — removing it was the migration that made the platform model work.

**OAuth provider (Google, GitHub)** — Rejected because it requires the user to have a third-party account, adds OAuth redirect complexity, and is unnecessary when the platform is self-contained with virtual-only currency. May be worth revisiting if the platform requires real-money transactions.

**Shared auth service (separate from the shell)** — Rejected because it adds a fifth service to deploy and maintain. The shell already exists; making it also serve as the auth frontend costs nothing.
