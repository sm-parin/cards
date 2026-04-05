# ADR-001: Turborepo Monorepo with pnpm Workspaces
Date: 2026-04-05
Status: Accepted

## Context
The Cards platform requires code sharing across four separate deployable applications: a server, a shell, and two game frontends. Without a monorepo, shared types and utilities would need to be published to npm (slow iteration) or duplicated in each app (drift and inconsistency). The decision of how to structure the monorepo — and which tools to use — had to be made before any other code was written.

## Decision
Use pnpm workspaces for package management and Turborepo for orchestrating builds across the workspace, with packages exporting TypeScript source directly (no separate compile step per package).

## Reasoning
Turborepo's `pipeline` configuration with `^build` dependency ordering ensures that shared packages are built before the apps that consume them, without manual ordering scripts. This is the specific feature that makes it preferable to a plain pnpm workspace without Turborepo.

Exporting TypeScript source directly (no dist/) means package changes are reflected immediately in app dev servers without a rebuild step. Next.js compiles workspace packages via `transpilePackages`. This is faster than pre-compiling and eliminates a class of "stale build" bugs.

## Consequences

### Positive
- Single `pnpm install` at the root sets up all apps and packages
- `pnpm turbo run build --filter=<app>` builds only what changed and its dependencies
- Shared types changes are reflected in apps without any publish step
- No version mismatch between packages — everything is always at `workspace:*`

### Negative
- pnpm v10 has a URLSearchParams bug that breaks Vercel builds; Vercel CI must use npm instead of pnpm
- `transpilePackages` must be maintained manually in each app's `next.config.ts`
- New developers must install pnpm specifically; npm will not resolve workspace: protocol
- The server (plain JS) cannot consume TypeScript packages — it maintains its own duplicate of event constants

### Neutral
- Two package managers in one project (pnpm locally, npm on Vercel) is unusual but not harmful as long as the sed command in vercel.json strips workspace: before npm install

## Alternatives considered
**Nx** — More powerful but significantly more complex configuration. The caching and affected-graph features of Nx exceed what this project needs. Turborepo configuration is a single `turbo.json`.

**Lerna** — Legacy tool, largely superseded by Turborepo for build orchestration. No advantage over Turborepo for this use case.

**Separate repositories** — Would require publishing shared packages to npm or using git submodules. npm publishing adds a CI step and version management overhead. Git submodules are notoriously error-prone. The iteration speed loss is significant.
