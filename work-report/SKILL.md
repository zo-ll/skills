---
name: work-report
description: Produce a full, grounded report of what was done in the current session or on the current branch — architecture, ownership, flows with file:line references, data shapes, developer setup steps, known gaps, and verification results. Use when the user asks for "a full report", "report on what was done", "summarize what changed", "write up what you did", or "explain the work".
---

# Work Report

Produce a thorough, honest report of the work done. The report must be **grounded in reality** (git + command output), not reconstructed from memory. It is written for a developer who will maintain, extend, and verify this code.

## Step 1 — Gather facts first (do NOT skip)

Before writing anything, run these and read the output. Never describe changes from memory alone.

```bash
git status --short
git diff --stat            # scope: files + line counts (use main...HEAD if reporting a branch)
git diff                   # the actual changes (or git diff main...HEAD for a branch)
git log --oneline -20      # recent commits for context
```

If the work spans multiple repositories or packages, run these in each affected repo.

Then, if relevant and not already run this session, execute the project's checks and capture real output:
- Tests (e.g. `phpunit`, `pest`, `vitest`, whatever the project uses)
- Linters (e.g. `eslint`, `phpstan`, `pint`)
- Build (e.g. `npm run build`)

Report only results you actually observed. If you did not run something, say so — do not claim it passes.

## Step 2 — Write the report

Use this structure. Omit a section only if it genuinely does not apply; never pad.

### Architecture
- What is the source of truth for this feature?
- **Ownership split**: who owns what (per package/module/layer). One line each.
- The high-level idea in 2-4 sentences.

### Flows
Break into concern-grouped subsections as appropriate (e.g. Backend Flow, Frontend Runtime, Admin Flow, Data Flow). For each:
- Describe the flow in prose, referencing concrete `path/to/file.ext:line` for every claim.
- Include **real data shapes** (actual JSON payloads, config examples, function signatures) where they clarify the contract.
- Explain *why* non-obvious decisions were made, especially anything that looks surprising.

### Developer Setup / How to Extend
Numbered, concrete steps for a developer to reproduce, extend, or add to this feature. Include exact commands and the gotchas that would trip someone up.

### Current Gaps
An honest list of:
- Known bugs or edge cases not handled.
- Untested paths (what has and hasn't got test coverage).
- Deliberate limitations and why.
- Whether changes are committed or still uncommitted (and across which repos).

Do not hide weaknesses. This section is the most valuable part of the report.

### Verification
State exactly what was run and its result — tests (count + assertions), lint, build (module count / status). Distinguish "passed" from "not run".

## Rules

- **Cite `file:line` for every factual claim** about the code. Prefer paths that are clickable/openable.
- **Ground everything in observed output.** No invented test results, no guessed line numbers.
- Prefer concrete snippets over vague description.
- Be honest about what is incomplete or untested — the Gaps section is not optional filler.
- Match the depth to the work: a small change gets a short report; a large feature gets the full treatment. Do not inflate.
- If the user names a specific scope (a file, a feature, a branch), report on that scope.
