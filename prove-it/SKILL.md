---
name: prove-it
description: >-
  Check the real artifact before you declare work done: run the feature, read
  the actual value, inspect the diff. Use on "prove it works", "did it
  actually work", or before any completion claim. Rejects proxies such as a
  build that compiles, a file timestamp, or a self-report.
license: MIT
---

# Prove it

Verify the task output against the real thing. Do not infer success from a proxy.

**Why:** an unverified result has unknown correctness. A proxy feels cheaper
than a direct observation. A wrong inference costs more than the check.

## Check the real thing

- Run the feature. Read the actual value. Inspect the diff.
- A build that compiles, a file timestamp, a cached screenshot, and a
  self-report are proxies. They are not proof.
- Verify a side effect directly: the file was written, the row was inserted,
  the message was sent.
- When a check fails, question the observation method before the system.

## Keep the proof

A single look is weak. A command repeats the same comparison.
Keep the check as a command a reviewer can re-run. The reviewer does not trust
your word.

Put each result in the report as a pointer: a commit SHA, `file:line`, or an
artifact path. Never a paragraph.
State the command and its output.
Name the failing-before state and the passing-after state when both exist.
Name every gap. A gap is never a pass.

## Related

- Use `cross-check` for an independent verdict from another agent.
- Use `small-units` to keep each change checkable.
- Use `check-the-check` to keep a project verification script honest.
