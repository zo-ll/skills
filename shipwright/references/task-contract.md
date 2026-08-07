# Worker task contract

Write every worker prompt with these sections:

```markdown
# Assignment

## Goal
One observable outcome.

## Workspace
Absolute checkout path and branch. State whether Shipwright launched the worker or attached to the user-owned agent target. For attach mode, summarize relevant work already present and preserve unrelated changes.

## Read first
Repository instructions, specification/ticket, relevant source and tests.

## Requirements
Numbered behavior and compatibility requirements.

## Non-goals
Explicit scope exclusions and prohibited actions.

## Verification
Exact checks the worker must run, plus any manual scenario.

## Execution budget
Provider quota/credit constraint, known reset time, and the point at which the worker must stop and hand off. Omit when no constraint is known.

## Handoff
Report changed files, behavior, tests with results, risks, and deviations. Do not merge, push, delete the checkout, or close the multiplexer. If the terminal transcript may be incomplete, write the report to the supplied handoff path.
```

The worker may choose implementation details within the contract. Require it to inspect facts rather than ask the parent questions answerable from the repository. Require it to stop before materially expanding scope.

When attaching after work has already started, send the contract as a continuation: acknowledge completed work, give only the next bounded objective, and preserve the current conversation. Do not resend the entire original assignment unless the worker has lost context.

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
