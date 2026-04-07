# Game Table UI/UX Revamp + Card Redesign
Date: 2026-04-07
Session type: Feature

## What was done
Completely revamped the game table layout for both Black Queen and Jack Thief simultaneously. Introduced `GameLayout` as a slot-based layout shell in `@cards/ui`. Redesigned the `Card` component with a modern dark minimal aesthetic, face card distinction, and mount animation. Both games now use the shared layout — no game-specific layout code remains.

## Why it was done
The previous layout was a plain vertical stack with no visual hierarchy resembling a card game. Cards were styled text boxes with no suit/rank distinction. No visual separation between opponents, played cards, and the player's hand made the game hard to follow at a glance. The user wanted a table metaphor with opponents at the top, played cards in the center, and own hand at the bottom.

## How it was done

The key insight was that the layout shell is identical across all card games: header, opponent strip, table area, game info + timer panel, own hand. Only the *content* of each slot varies. This made `GameLayout` the right abstraction — a pure shell component with five named slots, zero game logic, inline CSS only (required for transpilePackages compatibility).

Card design used dark navy (`#0f172a`) to differentiate face-up cards from the dark app background. Face cards (K/Q/J) got a crown badge character to distinguish from numbers at small sizes. Aces got an oversized suit symbol. The mount animation uses a `useState(visible)` + `requestAnimationFrame` pattern rather than CSS keyframes injection — the shared package has no CSS build pipeline.

BQ's `Card.tsx` (local component) was deleted. All card rendering routes through `@cards/ui Card` now. `HaathTable.tsx` was a hidden consumer that also needed updating.

JT's `PlayingScreen` was restructured: opponents are now `PlayerSeat` circles in the strip (clickable to select as pick target), the target's face-down cards appear in the table area during the pick window, and own hand is in the hand slot.

## Files changed

### Created
- `packages/ui/src/GameLayout.tsx` — slot-based game table shell; pure layout, no game logic
- `apps/game-black-queen/src/components/game/playing/OpponentsRow.tsx` — maps room players (excluding self) to PlayerSeat with isMyTurn + playedCard props
- `apps/game-black-queen/src/components/game/playing/GameInfoPanel.tsx` — bottom-left slot: phase label, whose turn, master suit, bid target, partner status, TurnTimer

### Modified
- `packages/ui/src/Card.tsx` — full visual redesign: dark navy face, face card badges, Ace variant, mount slide-in animation via useState/useEffect inline transition
- `packages/ui/src/CardHand.tsx` — changed flexWrap wrap → nowrap, added overflowX auto for scrollable single row
- `packages/ui/src/PlayerSeat.tsx` — added `playedCard` prop (chip below avatar), `onClick` prop for JT target selection
- `packages/ui/src/index.ts` — exported GameLayout
- `apps/game-black-queen/src/components/game/GameScreen.tsx` — rewrote to use GameLayout; fixed overlays (PartnerRevealBanner, StackFlash, notification) now position:fixed outside layout
- `apps/game-black-queen/src/components/game/PlayerHand.tsx` — replaced inline card divs with CardHand from @cards/ui
- `apps/game-black-queen/src/components/game/playing/Hand.tsx` — replaced local Card with CardHand from @cards/ui; disabledCards replaces the `valid` prop
- `apps/game-black-queen/src/components/game/playing/StackTable.tsx` — replaced local Card with Card from @cards/ui, changed flex-wrap to single row
- `apps/game-black-queen/src/components/game/playing/HaathTable.tsx` — updated import from deleted local Card to @cards/ui Card
- `apps/game-jack-thief/src/components/game/PlayingScreen.tsx` — full restructure using GameLayout, PlayerSeat, Card from @cards/ui; game logic (handlers, drag, timers) untouched

### Deleted
- `apps/game-black-queen/src/components/game/playing/Card.tsx` — superseded by @cards/ui Card

## Decisions made

Decision: GameLayout uses inline CSS only, not Tailwind
Alternatives considered: Tailwind utility classes
Reason: @cards/ui is consumed via transpilePackages — Next.js compiles the TypeScript but Tailwind's JIT scanner only finds classes in app source files, not in shared package source. Dynamically constructed background colors get purged.
Trade-off: Slightly more verbose than Tailwind; no responsive breakpoints without media query objects.

Decision: Mount animation via useState(visible) + requestAnimationFrame
Alternatives considered: CSS keyframes @keyframes injection, Framer Motion
Reason: No CSS build pipeline in @cards/ui. @keyframes requires either a CSS file or a CSS-in-JS library. RAF + state transition achieves the same effect with zero dependencies.
Trade-off: React renders twice on mount. Acceptable at card scale (< 20 cards visible).

Decision: BQ's `Card.tsx` deleted (not kept as wrapper)
Alternatives considered: Keep local Card, make it call @cards/ui Card internally
Reason: A wrapper adds a layer with no benefit. HaathTable.tsx was the only other consumer — updating one import is simpler than maintaining a pass-through component.
Trade-off: Any future BQ-specific card customization needs to happen in @cards/ui (which is correct — it should be platform-wide).

## Problems encountered

Problem: HaathTable.tsx still imported the deleted local Card and caused a TS error.
Root cause: The file wasn't identified in the initial audit of Card consumers (search focused on direct imports in changed files rather than all files in the playing/ directory).
Fix: Updated import to @cards/ui Card.
Prevention: When deleting a module, grep for all imports of that path before deletion.

Problem: tsc check on game apps showed React type errors in @cards/ui and @cards/hooks packages.
Root cause: Pre-existing — these packages ship raw TS without their own @types/react. Next.js handles JSX types via transpilePackages; standalone tsc cannot find react/jsx-runtime.
Fix: N/A — these are not real errors. Filter by `^apps/` to see only meaningful errors.
Prevention: Document this in AGENTS.md (done).

## Known issues introduced
None. TypeScript checks pass (app-level errors: 0).

## What a future agent needs to know

1. `GameLayout` fixed overlays must live OUTSIDE the component tree. PartnerRevealBanner, StackFlash, and error notifications use `position:fixed` — if placed inside GameLayout, they would be clipped by `overflow:hidden` on the root div. Always render them as siblings of `<GameLayout>` wrapped in a fragment.

2. `CardHand` is now `flexWrap: 'nowrap'`. Any code that relied on cards wrapping to multiple lines (e.g. large bidding-phase hand display) will now overflow horizontally. If multi-line layout is ever needed, pass a `className` or wrap in an outer div that constrains width.

3. JT's `PlayingScreen` restructure changed the pick interaction: clicking a player's avatar circle (PlayerSeat) now selects the target, and their face-down cards appear in the *table slot*. Previously, face-down card buttons were inline next to each player row. The socket emitters (emitJtSelectTarget, emitJtPickCard) are unchanged — only the affordance changed.
