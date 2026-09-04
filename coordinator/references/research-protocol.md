# Research protocol (research-first features)

For parked/new features needing a decision before implementation (#33, #71,
#72 style): the coordinator dispatches RESEARCH to the researcher window
(muse-spark), gets a brief back, and routes it to the user. Research NEVER
commits code and never decides — it returns a brief.

## Dispatch

1. Write the STUDY to `/tmp/shipwright/<project>/<task>/study.md`:
   - the feature spec + why it exists (from the issue, config-only
     constraints, etc.)
   - acceptance goals / non-goals
   - repo pointers (run loop, contracts, prior decisions, journal entries)
   - OPEN QUESTIONS the researcher must answer
   - the DELIVERABLE PATH for the brief (usually
     `docs/design/<project>/<feature>-research.md` next to the issue, or a
     /tmp path for exploratory items the user hasn't adopted yet)
2. Verify the researcher window is IDLE (prompt, no Working, no queued
   pointer).
3. Deliver a SINGLE-LINE pointer: `researcher: read <study.md> in full,
   execute the researcher procedure, brief to <deliverable path>`.
   Single-line only — pi fragments multi-line pastes (verified).

## Receive

- The researcher pings when done; the brief sits at the deliverable path.
- READ the brief fully. Route it to the user with a 5-line condensation
  (recommendation + the possibility spread + risks).
- The user decides (pick a direction, park, or ask for a re-study with
  narrower questions). Research results do NOT create worktrees or
  branches — a decided direction becomes a new issue + slice dispatch.

## Ground rules

- A study files ONE brief per assignment; re-studies get their own study file
  (narrower questions) — never an edit-loop on a live researcher turn.
- If the researcher handbacks (missing deliverable path/questions), fix the
  study and re-dispatch only when idle.
- Research is severable: give the study, never your lean — the brief should
  survive being wrong about what you assumed.