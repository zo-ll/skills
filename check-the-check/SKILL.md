---
name: check-the-check
description: >-
  Keep an app's verification command and feature map honest as the app
  changes: one source reader per feature, then one live pass that drives every
  feature. Use on "check the check", "audit the verify command", or when the
  command or the map looks stale.
license: MIT
---

# Check the check

A feature map becomes wrong when the app changes. This is the upkeep pass for
the command and the document that `verify-app` produces.

The unit of rigor is the feature, not every sentence. Cover every feature entry
from source, and exercise every feature live.

## Edit scope

Edit only the verification artifacts: `scripts/verify.sh`, `VERIFY.md`, and the
feature files under `docs/verification/`. Never edit product code in this pass.
A behavior the app no longer has is either doc drift (fix the map) or a product
regression (report it, do not hide it in the docs).

## Pass

1. Read every feature entry from source. Use one reader per entry. Run the
   readers in parallel when the harness allows. Each reader explains how the
   feature works, cites likely drift with `file:line`, and returns one live
   drive recipe.
2. Reconcile the reports. Merge duplicate drive recipes. Check every cited
   drift. Sweep recent changes for a user-facing surface missing from the map.
3. Drive every feature live. The coordinator drives all features.
4. Sort the findings. A wrong description is doc drift: fix it. A feature the
   command cannot drive is a gap: fix it. A broken feature is a product gap:
   report it, and keep it out of the fix.
5. Ship at most one change set of proven corrections. Otherwise report clean
   or blocked with no change.

## Invariants

Hold these for the whole pass, whatever the failure.

- Doctor before the first drive, after each fresh session, and after a failed
  drive.
- The evidence survives every cleanup. Check the named location. Do not
  assume.
- Nothing a drive started outlives that drive.
- Never weaken a feature journey to make it pass. A feature no reviewer can
  reach is `verified-unreachable` with its prerequisite. That is a gap, not a
  pass.

## Related

- Build the command and the document with `verify-app`.
