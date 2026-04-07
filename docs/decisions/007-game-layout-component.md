# ADR-007: GameLayout as shared slot-based game table shell
Date: 2026-04-07
Status: Accepted

## Context
Both Black Queen and Jack Thief needed a game table layout revamp. The layout pattern is identical across games: header, opponents strip, center play area, game info + timer (bottom-left), player hand (bottom-right). Without a shared component, each game reimplements the same CSS layout independently. Future games (game N) would do it a third time.

The constraint: @cards/ui ships raw TypeScript source consumed via Next.js `transpilePackages`. The package has no CSS build pipeline, so Tailwind utility classes written inside it are not scanned by the JIT compiler and get purged. All styling must use inline CSS from @cards/theme tokens.

## Decision
Add `GameLayout` to `@cards/ui` as a slot-based component with five named slots: `header`, `opponents`, `table`, `gameInfo`, `hand`. Games pass game-specific content as React nodes; `GameLayout` owns only the structural CSS.

## Reasoning
A slot API separates layout responsibility (position, sizing, overflow) from content responsibility (what goes in each zone). Games cannot accidentally break each other's layout by modifying a shared file. Adding a new game means importing GameLayout and filling five slots — no layout code to write.

The alternative was a layout defined per game (no sharing). This was rejected because it guarantees drift: BQ gets a spacing fix that JT never receives, minor inconsistencies accumulate over time. The layout is genuinely identical — there is no game-specific layout variation.

## Consequences

### Positive
- All future games get the table layout for free by using GameLayout
- Layout bugs fixed once and propagate to all games on next deploy
- Enforces the opponents-strip / table / bottom-row zone model as the platform standard

### Negative
- Inline CSS in @cards/ui is more verbose than Tailwind classes
- No responsive breakpoints without media query objects (not a current need, but worth noting)
- Any structural layout change affects all games simultaneously — requires regression testing on both

### Neutral
- Fixed overlays (notifications, flash effects) must be rendered outside GameLayout due to overflow:hidden on the root div. This is documented in AGENTS.md.

## Alternatives considered
Per-game layout components (no sharing): rejected — guaranteed layout drift across games at no benefit.
CSS Modules in @cards/ui: rejected — requires a CSS build pipeline the package does not have.
Tailwind in @cards/ui: rejected — JIT scanner doesn't reach transpilePackages source, so classes get purged at build time.
