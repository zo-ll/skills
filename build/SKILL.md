---
name: build
description: >-
  Implement a coding task or GitHub issue through the user's existing skills:
  understand the code, choose small checkable units, implement, and verify the
  real result. Use when the user explicitly invokes build or requests this workflow.
  The current agent does the work. No Filo, automatic delegation, or mandatory
  independent review.
license: MIT
---

# Build

Own the task from source inspection to verified behavior. Use the existing skills instead of another coordinator engine.

This skill governs the requested task and its corrections. It does not authorize unrelated work or activate a permanent mode.

The workflow is harness agnostic. Use the current harness's skill and tool interfaces. Do not require a particular CLI, editor, model provider, subagent extension, or terminal manager.

## Start

1. Resolve the repository and task from the request.
2. Read the applicable project instructions.
3. Inspect Git status before any edit.
4. Read the relevant source, callers, tests, and verification instructions.
5. State the required result and the command that can demonstrate it.

For a GitHub issue, read its current body, acceptance criteria, and relevant dependencies. Resolve the repository from the request or its Git remote. Ask when the repository is ambiguous.

Do not infer acceptance from the issue title alone. If a missing prerequisite blocks the task, report it instead of implementing another issue.

Preserve unrelated changes, staged work, and existing evidence. Do not reset, clean, stash, or rebase user work to obtain a clean baseline.

## Select only the required skills

Read each selected skill's `SKILL.md` before use. Resolve skills through the harness's advertised paths; do not assume this repository's installation path.

| Condition | Skill |
| --- | --- |
| Understand the affected implementation | `how` |
| Historical intent affects the change | `why` |
| Order implementation and checks | `small-units` |
| No existing command can verify the behavior | `verify-app` |
| A verification map appears stale or misses a feature | `check-the-check` |
| Before any completion claim | `prove-it` |
| The user requests an independent verdict | `cross-check` |
| The user explicitly requests a Git review | `code-review` |
| The user requests a full work report | `work-report` |

Use language-specific skills when the actual code requires them. Do not invoke every skill as a checklist. If a required skill is absent, state the gap instead of claiming that it ran.

Do not repeat idea validation after the user decides to implement. Do not invoke Filo, pstack, or another coordinator engine.

## Understand and choose the shape

Use `how` to trace the affected flow. Keep the scope narrow; an unrelated subsystem does not require investigation.

For a bug, reproduce the reported failure before the fix. Record the actual result and the required result.

Before a shared interface changes, write one caller example and the smallest required types or signatures. Test an uncertain language constraint with a small executable probe.

Compare two designs only when a concrete unresolved choice affects correctness or the public interface. Do not create competing agents by default.

Ask about an unresolved product decision that materially changes the result. Make reversible implementation choices within the accepted scope without repeated confirmation.

## Implement one checkable unit

Use `small-units`. For a narrow task, one unit is enough. For a larger request, list the dependency order and the check for each unit.

1. Run the relevant baseline checks.
2. Add the smallest behavior check for the current unit.
3. Confirm that the new check fails for the intended reason.
4. Make the smallest complete implementation change.
5. Run the unit check and the relevant existing checks.
6. Continue only after this unit passes.

If a test cannot fail meaningfully before implementation, record why. Use an executable probe or an observed before-and-after result instead.

If a baseline check already fails, separate that failure from the requested change. Do not weaken the check or silently repair unrelated code. Stop when that failure prevents reliable verification.

Reuse the existing verification command. Add checks and update its feature map when the behavior changes. Use `verify-app` only when no existing path can demonstrate the result.

After two failed fixes for the same symptom, stop patching. Inspect the shared assumption and reproduce the failure at its source.

## Verify the real result

Use `prove-it` before the final report. Execute the actual user path, inspect its output or side effect, and inspect the complete task diff.

A successful build, a model's approval, and a handwritten target fixture do not establish that a generator works. A compiler task must exercise source input, generated code, the real compiler, and actual output.

Keep the exact commands, exit results, and useful artifacts. Put evidence in the project's existing location. If none exists, use an ignored or external temporary directory.

Check invalid input and the relevant trust boundary. Do not claim a security guarantee beyond the contexts that the checks cover.

When verification cannot run, report `blocked` or `partial`. Name the missing check. Do not report a complete result.

## Independent review is optional

Do not start review agents or extra model sessions by default. A concrete unresolved question can justify a review proposal; ask before launching it.

If the user requests review, use `cross-check` with an available reviewer mechanism. Honor a reviewer skill that the user explicitly selects. Do not stack several review routes over the same artifact automatically.

Give the checker the acceptance criteria and frozen artifact, not the maker's reasons. Require evidence for consequential findings. Convert confirmed defects into regression checks.

If an independent checker is unavailable, state that limitation. Do not call self-review independent review.

For asynchronous review, follow the selected mechanism and report review pending. Do not claim completion before a required verdict arrives. A changed artifact requires a new applicable verdict.

## Publication boundaries

Implementation alone does not authorize commits, pushes, PRs, merges, issue closure, package publication, or repository visibility changes.

Honor explicit authorization for those actions within the task scope. A request to open a PR permits the necessary task commits and branch push, but not merge or issue closure.

Do not start another issue merely because this issue passes. Continue through a queue only when the user authorizes that queue.

## Report

Keep the final response short unless the user requests a report:

- **Changed:** the observable result and relevant paths.
- **Verified:** exact commands, actual results, and evidence paths.
- **Gaps:** unsupported cases, blocked checks, or pending requested review.
- **Git:** local, committed, pushed, or PR state, only as actually observed.

Do not describe tests that did not run as passes. Do not repeat a plan as a completion report.
