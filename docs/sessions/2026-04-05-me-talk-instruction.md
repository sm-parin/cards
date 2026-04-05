# Add Me Talk Instruction
Date: 2026-04-05
Session type: Documentation

## What was done
Added "Me talk" communication style as a permanent agent instruction via the ADD INSTRUCTION protocol. Created docs/agent-instructions.md and updated AGENTS.md to reference it in Step 0.

## Why it was done
No instruction file existed. ADD INSTRUCTION protocol requires a permanent home for agent rules outside of AGENTS.md (which gets overwritten each session). Me talk style reduces verbosity in agent responses.

## How it was done
Created docs/agent-instructions.md as the permanent home for ADD INSTRUCTION rules. Updated AGENTS.md Step 0 reading list to include it. Style applies immediately to all responses.

## Files changed

### Created
- docs/agent-instructions.md — permanent agent rule file; stores ADD INSTRUCTION entries across sessions
- docs/sessions/2026-04-05-me-talk-instruction.md — this file

### Modified
- AGENTS.md — added Step 0 reading list section; added communication style section; updated last-updated date

## Decisions made

Decision: Store ADD INSTRUCTION rules in docs/agent-instructions.md, not in AGENTS.md
Alternatives considered: Embed rules directly in AGENTS.md
Reason: AGENTS.md is overwritten every session. Rules embedded there would be lost unless the overwriting agent remembered to copy them. A separate file that is explicitly read in Step 0 survives rewrites.
Trade-off: One more file to read at session start.

## Problems encountered
None. Straightforward file creation.

## Known issues introduced
None.

## What a future agent needs to know
1. Read docs/agent-instructions.md in Step 0 — it is now mandatory alongside AGENTS.md and WRITING_GUIDE.md. Skipping it loses permanent rules including the Me talk style.
2. When overwriting AGENTS.md, always preserve the Step 0 reading list section that references agent-instructions.md. If that reference disappears, future agents will not know to read the instructions file.
3. New ADD INSTRUCTION entries append to docs/agent-instructions.md — never overwrite the whole file, only add sections.
