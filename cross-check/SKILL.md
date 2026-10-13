---
name: cross-check
description: >-
  Get an independent verdict on work: a second agent, on a different model
  family, reads the artifact and the acceptance criteria, not the maker's
  reasons. Use on "cross-check", "second opinion", "adversarial review", or
  before a merge the maker cannot approve alone.
license: MIT
---

# Cross-check

Self-review is not a substitute for review. The maker knows its intent, and it
approves its own output too easily. Move the verdict to a second party.

## Run it

1. State the acceptance criteria in one paragraph. If the intent is unclear,
   ask the user before you continue.
2. Give the checker the criteria and the artifact: the diff, the file, or the
   running app.
3. Do not give the checker the maker's reasons. The reasons bias the verdict.
4. Ask for an adversarial verdict. The signal comes from model diversity, not
   from assigned personas.
5. Keep the checker read-only. The checker never edits the work it checks.

Harness subagent tools differ. Use the tool your harness has: `Task` in
Cursor, `Agent` in Claude Code, `task` in OpenCode, `spawn_agent` in Codex.
In Pi, use a subagent extension. If the harness has no subagent tool, run the
check again yourself, against the written criteria.

## Judge the findings

Put every finding in one group:

- **Act on:** a real issue in correctness, security, or maintainability.
- **Consider:** valid, but the cost may outweigh the benefit now.
- **Noted:** valid but not actionable at this stage.
- **Dismissed:** wrong, or it misses context. Give the reason.

A finding that two checkers raise independently is the highest signal.
Do not apply findings automatically. The lead decides.
Report each finding with the checker model and a one-line rationale.

## Related

- Check the real artifact per `prove-it`.
