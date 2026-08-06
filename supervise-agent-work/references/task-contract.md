# Worker task contract

Write every worker prompt with these sections:

```markdown
# Assignment

## Goal
One observable outcome.

## Worktree
Absolute isolated-worktree path and branch.

## Read first
Repository instructions, specification/ticket, relevant source and tests.

## Requirements
Numbered behavior and compatibility requirements.

## Non-goals
Explicit scope exclusions and prohibited actions.

## Verification
Exact checks the worker must run, plus any manual scenario.

## Handoff
Report changed files, behavior, tests with results, risks, and deviations. Do not merge, push, or delete the worktree. If the terminal transcript may be incomplete, write the report to the supplied handoff path.
```

The worker may choose implementation details within the contract. Require it to inspect facts rather than ask the parent questions answerable from the repository. Require it to stop before materially expanding scope.

For a correction turn, include:

```markdown
# Review findings

## Blocking evidence
File/line, failing command, observed output, or unmet scenario.

## Expected behavior
The requirement that must become true.

## Constraints
Anything that must remain unchanged.

## Required verification
Checks to rerun and report exactly.
```
