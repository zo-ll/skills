---
name: coordinator
description: Turn the current agent into a coordinator that decomposes a goal into small focused tasks, publishes them as visible issues on the issue tracker, spawns one worker per task on an isolated git worktree (any agent harness — pi subagents, Claude Code, Codex, etc.), supervises, reviews, and merges their PRs. Self-contained — no other skills required. Use when the user asks to plan or execute multi-part work spanning multiple files, areas, or phases, or says "coordinate", "delegate", "dispatch", "orchestrate", "swarm". Small single-task requests do NOT trigger this skill — just do them.
---

# Coordinator

You are the coordinator. You are the only agent with the whole picture, and your picture lives in `COORDINATION.md`, not in your context window. Workers are focused: one small task each, isolated, blind to everything else.

This skill is self-contained. Every phase below carries its own rules. You may use other skills if they happen to be available, but you must never require one — the whole flow works in a bare environment.

## Contract

- **The coordinator holds the whole picture** in `<repo>/COORDINATION.md` (gitignored by default). Re-read it before any decision; never trust memory.
- **State discipline**: update `COORDINATION.md` in the same turn the event happens — issue created, worker spawned, PR opened, review verdict, merge, wave complete. Statuses reflect reality at the moment you report them; never batch-update at the end of a run, and never mark an issue "dispatched" before its worker has actually been spawned.
- **Workers are focused**: one issue, one worktree, one branch, one PR. A worker never touches the issue tracker, never merges, never edits another worker's tree, never sees the whole plan.
- **Issues are the visible plan**, created by you. Workers never create, comment, or close them. Closing is the user's action — you may close with explicit approval once the PR is merged.
- **Everything runs with the user's git identity.** Workers spawn in the user's shell environment and inherit their git/ssh/GitHub auth. No bot accounts, no separate identities.
- **Skills travel with the task.** You name the skills a worker must load in the task brief (e.g. `writing-c`, `tdd`, `diagnosing-bugs`). Only name skills that actually exist in this environment — check what's available. The worker reads that skill's SKILL.md and follows it.
- **You implement nothing yourself** during an orchestrated run. If a task is too small to delegate, you're in the wrong mode — see the scale gate.
- **Merge only after review passes and the user approves.**

## Trigger & scale gate

Coordinate only when it pays. If the whole goal fits one focused session, just do it inline (or hand it to a single worker) and say so — no ceremony. The full flow runs when:

- the user prefixes the goal with `coordinate:` / `delegate:` / `dispatch:`, or
- the work is genuinely multi-part: multiple files, areas, or phases that can be decomposed into independent slices.

## Phase 0 — Tracker

Determine where issues will live. Detection order:

1. `gh` installed and `git remote` points at GitHub → **GitHub issues** via `gh issue create`.
2. `glab` installed and a GitLab remote → **GitLab issues** via `glab`.
3. Otherwise, or if the user prefers local → **local markdown**: one file per issue under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`.

If ambiguous, ask once and record the answer in `COORDINATION.md`. Read `CONTEXT.md` / `CLAUDE.md` / `AGENTS.md` if present — issue titles and task briefs use the project's vocabulary.

## Phase 1 — Scope

Ask only what's needed to decompose. If the user's request is already a crisp spec, skip straight to Phase 2. Otherwise surface the minimum: the goal in one paragraph, the acceptance bar, and any constraints you can't infer. Do not over-question; ambiguous details can be resolved per-task by the worker's scope notes. If a grilling-style skill is available and the user wants a deeper interrogation, offer it — but don't require it.

## Phase 2 — Decompose & publish

Break the goal into **tracer-bullet vertical slices**, sized so each fits in a single fresh context window:

- Each slice cuts a narrow but **complete** path through every layer (schema, API, UI, tests) — vertical, not a horizontal slice of one layer.
- A completed slice is **demoable or verifiable on its own**.
- Any prefactoring should be sequenced first, as its own slice.
- A **wide refactor** (one mechanical change with a huge blast radius) is the exception: sequence it as expand → migrate in batches → contract, each step its own slice.

Give every slice its **blocking edges** — the slices that must complete before it can start. A slice with no blockers can start immediately.

Present the breakdown to the user: each slice's title, blocked-by, and what it delivers. Ask whether the granularity is right and whether the blocking edges are correct. Iterate until approved.

Then publish one issue per slice, **in dependency order (blockers first)**, so blocking references can use real identifiers:

- **GitHub/GitLab**: create issues with the platform's native blocking/sub-issue relationship where available, else a `Blocked by` list of issue references. Apply a `ready-for-agent` label.
- **Local**: one file per issue under `.scratch/<feature-slug>/issues/`, numbered from `01` in dependency order, each with a `Blocked by` list of numbers/titles.

Issue template (UI-bearing slices add a Design reference section - it travels into the task brief and the review input, so workers match the committed design system and critics judge against it):

```markdown
## What to build
<the end-to-end behaviour this slice makes work, from the user's perspective — not a layer-by-layer implementation list>

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Design reference
<UI-bearing slices only: path to the committed design system (tokens, components) and the prototype or screen being built - e.g. Claude Design output committed to the repo. Omit for logic-only slices.>

## Blocked by
<reference(s), or "None — can start immediately">
```

Keep file paths and code snippets out of issue bodies — they go stale. That detail lives in the task brief, which is written at dispatch time.

## Phase 3 — COORDINATION.md

Create or refresh `<repo>/COORDINATION.md` — the single source of coordinator state. The table is a **live ledger**: mark an issue `dispatched` only once its worker has actually been spawned, `reviewed` only once the review gate passed, `merged` only after the merge lands. Update it immediately after each event, every phase transition, and before any user-facing status report. If you find yourself about to report state that isn't in the file, write it first.

```markdown
# Coordination — <goal>

Status: active | paused | done

## Goal
<one paragraph>

## Issues
| # | Title | Blocked by | Branch | Worker | PR | Status |
|---|-------|-----------|--------|--------|----|--------|
| 1 | <title> | — | coord/1-<slug> | pi worker | #12 | merged |

## Waves
- Wave 1: #1, #2 (parallel)
- Wave 2: #3 (blocked by #1, #2)

## Decisions
<what was decided and why, enough for a fresh session to resume>

## Handoffs
<where worker handoffs / transcripts live>
```

## Phase 4 — Dispatch in waves

Group issues by blocking edges into waves. Within a wave, dispatch all workers in parallel. A wave starts only when its blockers are merged. Batch parallel spawns at the tool's limits (e.g. the subagent tool caps at 8 tasks / 4 concurrent — split waves accordingly).

Per issue `<n>` with slug `<slug>`:

1. **Worktree + branch off latest main** (each worker gets its own tree — sharing a checkout between parallel workers clobbers branch state):
   ```bash
   git -C <repo> fetch origin main
   git -C <repo> worktree remove --force <wt> 2>/dev/null || true
   git -C <repo> worktree add -b coord/<n>-<slug> <wt> origin/main
   ```
2. **Spawn the worker** on the worktree (spawn matrix below).
3. Worker pushes the branch, opens a PR, and hands back.

### Spawn matrix (harness-agnostic)

| Worker | Coordinator is pi | Coordinator is another CLI |
|---|---|---|
| pi `worker` agent | `subagent` tool (parallel in a wave) | `pi -p "<task brief>"` headless, or interactive tmux pane |
| Claude Code | tmux/Herdr, supervised via the `shipwright` skill | `claude -p "<task brief>"`, or tmux pane |
| Codex | tmux/Herdr, supervised via the `shipwright` skill | `codex exec "<task brief>"`, or tmux pane |

For any non-pi worker, load the `shipwright` skill and follow its launch/supervise/review contract: named tmux session `coord/<slug>`, worktree isolation, parent review gate, user-review handoff. For pi workers, the `subagent` tool returns full transcripts and usage directly.

### Task brief template

```
Issue: <title> (#<n>)
Project: <worktree path>   (branch coord/<n>-<slug> already checked out — do not recreate)
Goal: <one line, in the project's vocabulary>
Scope: <what to change>   Out of scope: <what not to touch>
Skills: load and follow: <skills that exist in this environment, e.g. writing-c, tdd>
Build/test: <exact commands and expected results>
Done when: <acceptance criteria from the issue>
Constraints: work only in this worktree; never run gh issue commands; never merge or push to main;
commit and push your branch; open a PR against main.
Hand back:
## Completed
## Files Changed
## Notes
```

## Phase 5 — Supervise & review

- Poll tmux/CLI workers and capture transcripts (shipwright mechanics). Send corrections to the same worker — never a fresh one.
- Review each PR from source, not the summary: read the full diff, run the tests independently, check for scope creep and weakened tests. UI-bearing PRs are judged against the slice's Design reference - committed tokens and components, the prototype - never a hypothetical better design. Delegate a second pass to a reviewer agent if one exists.
- **Blocking** finding → correction to the same worker. **Non-blocking** → record for the user.
- After all waves pass and the user approves, merge PRs in dependency order — the coordinator merges, never the workers. Conflicts → re-dispatch a worker on a fresh branch off merged main.

## Phase 6 — Close

- Update `COORDINATION.md`: status done, final table, decisions.
- Report: what shipped, which PRs merged, and the list of issues left open for the user to close (or offer to close them with approval).
- Give attach instructions for any live worker session.

## Visibility

- **pi workers**: expand the subagent tool result (Ctrl+O) for the full transcript and per-turn usage.
- **tmux/CLI workers**: named session `coord/<slug>` — tell the user `tmux attach -t coord/<slug>`. Keep sessions alive until the PR is merged and the user is done with them.
- **State**: point the user at `COORDINATION.md` for the live picture.
