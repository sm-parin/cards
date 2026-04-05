# How to write developer documentation for this project
# Read this before writing any file in docs/

## The two-document system

AGENTS.md = AI context file. Lives at monorepo root. Overwrite it completely
at the end of every session. Always reflects current state only. No history.

docs/ = Developer knowledge base. Append only. Never modify old entries.
New sessions add new files. Old files are permanent record.

## When to write what

Every session without exception:
  docs/sessions/YYYY-MM-DD-[3-word-slug].md

When a significant architectural choice is made:
  docs/decisions/NNN-[slug].md

When a bug is found and fixed:
  docs/issues/[slug].md

When a how-to topic changes or is first documented:
  docs/guides/[topic].md

When system topology, auth, schema, or packages change:
  docs/architecture/[relevant-file].md

## docs/ folder structure
```
docs/
├── WRITING_GUIDE.md              this file — read before writing anything
├── architecture/
│   ├── overview.md               how everything connects
│   ├── auth-flow.md              auth + cross-origin token passing
│   ├── database.md               schema + Redis keys + query rules
│   ├── shared-packages.md        what each package owns and why
│   └── adding-a-game.md          step-by-step for game N
├── sessions/
│   └── YYYY-MM-DD-[slug].md      one file per agent session
├── decisions/
│   └── NNN-[slug].md             architectural decision records
├── issues/
│   └── [slug].md                 bugs + RCAs + fixes
└── guides/
    ├── local-dev.md              running everything locally
    ├── deployment.md             deploying each service
    └── [topic].md               any how-to topic
```

---

## SESSION FILE FORMAT

Filename: docs/sessions/YYYY-MM-DD-[what-you-did-in-3-words].md
```
# [What changed — plain English title]
Date: YYYY-MM-DD
Session type: Feature | Migration | Fix | Refactor | Infrastructure | Documentation

## What was done
2-3 sentences. What the session set out to do and whether it succeeded.

## Why it was done
The problem that existed before. What pain it caused. Why it needed fixing now.

## How it was done
The approach and key technical choices. Not a file list — the reasoning behind
the approach. Why this way and not another.

## Files changed

### Created
- path/to/file — what it does and why it was created

### Modified
- path/to/file — what changed and the reason for the change
  (not "updated X" — explain why X needed to change)

### Deleted
- path/to/file — why removed

## Decisions made

For each significant choice:

Decision: [what was chosen]
Alternatives considered: [what else was possible]
Reason: [why this over alternatives]
Trade-off: [what was sacrificed]

## Problems encountered

For each problem:

Problem: [what went wrong]
Root cause: [why it happened — not the symptom, the cause]
Fix: [what resolved it]
Prevention: [how to avoid this class of problem in future]

## Known issues introduced
Anything left incomplete, broken, or deliberately deferred. Be honest.
If nothing: write "None."

## What a future agent needs to know
The non-obvious things that will matter in the next session.
Not file paths. The gotchas, constraints, "don't do X because Y" knowledge.
Write at least 3 specific points. This section is the most important one.
```

---

## DECISION RECORD FORMAT (ADR)

Filename: docs/decisions/NNN-[slug].md (NNN = zero-padded incrementing number)
```
# ADR-NNN: [Title]
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-NNN

## Context
What situation forced this decision. What constraints existed.
What would have happened without making an explicit choice here.

## Decision
What was decided. One clear sentence.

## Reasoning
Why this option. What made the alternatives worse.
Be specific — "it was simpler" is not a reason.

## Consequences

### Positive
Benefits this decision brings.

### Negative
Costs or limitations this decision creates. Be honest.

### Neutral
Changes that are neither good nor bad but worth noting.

## Alternatives considered
Each alternative with the specific reason it was rejected.
```

---

## ISSUE RECORD FORMAT

Filename: docs/issues/[descriptive-slug].md
```
# Issue: [Title]
Date discovered: YYYY-MM-DD
Date resolved: YYYY-MM-DD (or "open")
Severity: Critical | High | Medium | Low
Status: Open | Resolved | Won't fix

## What happened
Observable behavior. What the user or developer saw.

## Root cause
The actual technical reason. Not the symptom — the underlying cause.

## How it was found
User report / test / code review / accidental discovery.

## Fix
Exactly what changed to resolve it. File and change description.

## Why this fix and not another
If there were multiple options, explain the choice.

## How to prevent recurrence
Code pattern, test, lint rule, or process change that prevents
this class of bug from occurring again.
```

---

## WRITING RULES — apply to every doc file

### Voice
Write as if explaining to yourself six months from now.
The reader is technically competent but has zero memory of this session.

### Always include
- The WHY behind every decision
- What alternatives were considered and why they were rejected
- What the state was BEFORE a change, not just after
- What broke or almost broke during the session
- What a future agent or developer must NOT do in this area, and why

### Never include
- File contents or large code blocks (reference the file path instead)
- Obvious statements ("this file was created to create this file")
- Placeholder text ("TBD", "to be documented", "see above")
- Filler ("great progress was made", "everything went smoothly")

### Length targets
Session files: 400–800 words
Decision records: 200–400 words
Issue records: 200–500 words
Guide files: as long as needed to be genuinely useful

### Tense
Past tense for what happened in a session.
Present tense for how things currently work.
