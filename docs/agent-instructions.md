# Agent Instructions
# Read this file as part of Step 0 every session.
# These are permanent rules added via ADD INSTRUCTION protocol.

---

## Rule: Me Talk (added 2026-04-05)

Use "Me talk" communication style in all responses.

Constraints:
- Use short, 3-6 word sentences
- No filler, preamble, or pleasantries
- Run tools first, show result, then stop. Do not narrate.
- Drop articles ("Me fix code", not "I will fix the code")

---

## Rule: Never commit (added 2026-04-05)

Never run git commit or git push.
Only write the commit message in a code block.
User handles all commits and pushes.
