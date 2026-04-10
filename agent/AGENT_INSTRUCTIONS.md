# AGENT_INSTRUCTIONS.md
# Read this first. Every session. No exceptions.
# Optimized for minimum tokens — follow exactly as written.

---

## STEP 0 — Load context first

Read in order:
1. `cards/AGENTS.md` — current platform state
2. `cards/docs/WRITING_GUIDE.md` — doc format rules

Confirm: "Context loaded. [branch type] — [task in 5 words]."
Then proceed.

---

## TALK STYLE (PERMANENT)

- Short 3–6 word sentences only
- No filler, preamble, pleasantries, narration
- Run tools first, show result, then stop
- Drop articles ("Me fix code" not "I will fix the code")

---

## NEVER COMMIT (PERMANENT)

- Never run `git commit` or `git push`
- Write commit message in code block only
- User handles all commits and pushes

---

## RULE 1 — Branch naming

I give you a type. You create the branch.

| My type | Prefix | Example |
|---------|--------|---------|
| feature | feat/ | feat/coin-leaderboard |
| bug | fix/ | fix/turn-timer-reset |
| change request | cr/ | cr/lobby-max-players |
| task | task/ | task/shared-library-setup |
| refactor | refactor/ | refactor/auth-package |
| infrastructure | infra/ | infra/render-deployment |
| documentation | docs/ | docs/bootstrap-guides |

```
git checkout -b [prefix]/[max-5-word-slug]
```

Report: "Branch created: [name]"

---

## RULE 2 — Scope: all games unless told otherwise

If I say "only for [game]" → game-specific only.
Otherwise → platform-wide. Always.

Before every change ask: "Does this belong in a shared package?"

| Yes → shared | No → game only |
|---|---|
| Put in packages/ first | Keep in apps/game-[name]/ |
| Update all consumers | Add comment: why not shared |

---

## RULE 3 — Shared library is source of truth

packages/ is the atomic library. Before writing anything:

1. Check if it exists in packages/ already → import it
2. Useful to 2+ games → add to packages/, import everywhere
3. Game-specific only → keep in game, comment why

Think bigger. One change in packages/ improves all games simultaneously.
Never make the minimal change. Make the correct change at the right level.

Packages and their purpose:

| Package | Owns |
|---------|------|
| @cards/types | All shared TS types + socket event names |
| @cards/config | GAME_CONFIG — game registry |
| @cards/auth | login/register/token utilities |
| @cards/theme | colors, tokens, Tailwind preset |
| @cards/i18n | t(), registerGameTranslations() |
| @cards/hooks | useCountdown, useToast, useWindowFocus, useLocalStorage, useDebounce |
| @cards/ui | Card, CardHand, PlayerSeat, TurnTimer, CoinDisplay, ToastList, Button, RoomPlayerList |
| @cards/game-sdk | createGameSocket, getSocket, destroySocket, useGameConnection, useRoom, useSelf |

---

## RULE 4 — Commit message format

Write at end of session. Never execute.

```
[type]([scope]): [imperative description — max 72 chars]

Why:
[Problem solved. 1–3 sentences.]

What changed:
- [file]: [what + why]
- [file]: [what + why]

Shared library impact:
[Packages updated and what changed. Or: None.]

Breaking changes:
[Changes requiring dev action. Or: None.]

Testing notes:
- [flow to verify]
- [flow to verify]

Refs: [branch name]
```

Label the block: `COMMIT MESSAGE`
Nothing after the block.

---

## RULE 5 — Documentation is mandatory

Session is not complete without this. Not optional.

### 5a — Overwrite AGENTS.md

Replace entire file. Never append.
Current state only. No history. No prose.
Dense facts only. Every line = information an agent needs.

### 5b — Create session file

Path: `cards/docs/sessions/YYYY-MM-DD-[3-word-slug].md`

Follow format in `cards/docs/WRITING_GUIDE.md` exactly.
Fill every section. No placeholders.
"What a future agent needs to know" → min 3 specific non-obvious points.

### 5c — ADR if needed

Significant architectural choice made → create `cards/docs/decisions/NNN-[slug].md`
No architectural choice → skip, state so.

### 5d — Issue record if needed

Bug found and fixed → create `cards/docs/issues/[slug].md`
No bugs → skip, state so.

### 5e — Architecture docs if needed

Topology / auth / schema / packages / deployment changed →
update relevant file in `cards/docs/architecture/`
Nothing structural changed → skip, state so.

---

## RULE 6 — ADD INSTRUCTION protocol

I send: "ADD INSTRUCTION: [rule]"

You:
1. Acknowledge the rule
2. Append it to `agent/AGENT_INSTRUCTIONS.md` under the INSTRUCTIONS section below
3. Apply immediately

---

## SESSION SEQUENCE

Run in this exact order every time:

```
0  Read AGENTS.md + WRITING_GUIDE.md
   Confirm context loaded

1  Create branch
   Report branch name

2  Read relevant codebase files
   Never assume — read actual files

3  Plan changes
   List files to change
   State shared vs game-specific for each
   Identify downstream consumers needing update
   Report plan before writing code

4  Execute changes
   Rules 2 + 3 apply throughout
   Fix all TS errors — never @ts-ignore
   Never break existing functionality

5  Verify
   Run build commands
   Report output
   List errors + resolutions

6  Documentation (Rule 5)
   5a Overwrite AGENTS.md
   5b Create session file
   5c ADR if needed
   5d Issue record if needed
   5e Architecture docs if needed
   Report every doc file written

7  Write commit message (Rule 4)
   COMMIT MESSAGE code block
   Stop. Nothing after.
```

---

## HARD RULES — never violate

- No `@ts-ignore` or type casts
- No cross-imports between server game folders
- No `io.to(player.id)` — always `player.socketId`
- No committing `.env` or `.env.local`
- No game-specific logic in shared packages
- No modifying old `docs/sessions/` files — permanent record
- No skipping documentation
- No `git commit` or `git push` — ever
- No game-only change when it should be platform-wide
- No proceeding without reading AGENTS.md first

---

## HOW TO START A SESSION

User sends:
```
Type: [feature | bug | cr | task | refactor | infra | docs]
Task: [description]
```

You: read context → confirm → create branch → plan → execute → verify → document → commit message.

---

## INSTRUCTIONS — Added via ADD INSTRUCTION protocol

### INSTRUCTION 1 — Append chat to CHAT.md
At the end of every exchange, append the user message and agent response to `docs/CHAT.md`.
Format: use **User:** and **Agent:** headers, separated by a blank line.
Append only — never overwrite existing content.

### INSTRUCTION 2 — Update docs at end of each exchange
At the end of every exchange where code or architecture changed, update relevant docs:
- Overwrite `agent/AGENTS.md` with current state
- Create/update session file in `docs/sessions/`
- Create ADR in `docs/decisions/` if architectural choice was made
- Create issue record in `docs/issues/` if bug was fixed
- Update `docs/architecture/` if topology/auth/schema/packages/deployment changed
Do this alongside CHAT.md — both happen at the end of every exchange.

### INSTRUCTION 3 — Commit message format
Always write the commit message inside a code block (triple backticks).
Follow the RULE 4 template. Label it `COMMIT MESSAGE` above the block.

### INSTRUCTION 4 — Skip branch creation
Never create a git branch. Skip RULE 1 and Step 1 of the SESSION SEQUENCE entirely.
Work directly on whatever branch is currently checked out.