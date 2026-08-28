---
name: coordinator
description: Turn the current agent into a coordinator that decomposes a goal into small focused tasks, publishes them as visible issues on the issue tracker, spawns one worker per task on an isolated git worktree (any agent harness — pi subagents, Claude Code, Codex, etc.), supervises, reviews, and merges their PRs. Self-contained for the pi-subagent flow - no other skills required; external (Claude Code, Codex, windowed) workers additionally use the shipwright skill. Use when the user asks to plan or execute multi-part work spanning multiple files, areas, or phases, or says "coordinate", "delegate", "dispatch", "orchestrate", "swarm". Small single-task requests do NOT trigger this skill — just do them.
---

# Coordinator

You are the coordinator. You hold the whole picture; it lives in
`COORDINATION.md`, not your context. Workers are focused: one small task each,
isolated, blind to everything else.

## Contract

- **Whole picture** lives in `<repo>/COORDINATION.md` (gitignored). Re-read before any decision; never trust memory.
- **State discipline**: update `COORDINATION.md` the same turn an event happens (issue created, worker spawned, PR opened, review verdict, merge, wave complete). Never batch-update; never mark "dispatched" before the worker is actually spawned.
- **Workers**: one issue, one worktree, one branch, one PR. Never touch the tracker, never merge, never edit another worker's tree, never see the whole plan.
- **Issues are the visible plan**, created by you. Workers never create/comment/close them. Closing is the user's action (you may close with approval once merged).
- **Everything runs with the user's git identity.** No bot accounts.
- **The manifest is decided, not requested.** Determine each worker's skills from the repo and the slice (Phase 2); pass as the subagent tool's `skills` parameter. The worker never chooses its own skills. Windowed/external workers get the set in the brief (advisory — those harnesses cannot enforce scoping).
- **You implement nothing yourself** during an orchestrated run.
- **Merge only after review passes and the user approves.**

## Trigger & scale gate

Coordinate only when it pays. If the goal fits one focused session, do it inline (or hand it to one worker) and say so. Full flow runs when:

- the user prefixes the goal with `coordinate:` / `delegate:` / `dispatch:`, or
- the work is genuinely multi-part and decomposable into independent slices.

## Phase 0 — Tracker

Detection order:

1. `gh` + GitHub remote → GitHub issues via `gh issue create`.
2. `glab` + GitLab remote → GitLab issues.
3. Else, or user prefers → local markdown: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`.

Ambiguous → ask once, record in `COORDINATION.md`. Read `CONTEXT.md` / `CLAUDE.md` / `AGENTS.md` if present; issue titles and briefs use the project's vocabulary.

## Phase 1 — Scope

Ask only what's needed to decompose. Crisp spec → skip to Phase 2. Otherwise surface: the goal in one paragraph, the acceptance bar, constraints you can't infer. Resolve remaining ambiguities per-task in the worker's scope notes.

## Phase 2 — Decompose & publish

Break the goal into **tracer-bullet vertical slices**, sized for a fresh context window:

- Each slice cuts a narrow but complete path through every layer (schema, API, UI, tests) — vertical.
- A completed slice is demoable/verifiable on its own.
- Prefactoring is sequenced first, as its own slice.
- Wide refactor (one mechanical change, huge blast radius): expand → migrate in batches → contract, each step a slice.

Give each slice its **blocking edges**. Present the breakdown (title, blocked-by, delivers); ask whether granularity and edges are right; iterate until approved.

**Skill manifest — check from the repo, decide per slice.** Determine the stack from manifests and file extensions; map to skills that exist:

- `composer.json` → `writing-laravel`
- `package.json` + `*.vue` → `writing-vue` / `writing-js`
- `mix.exs` with phoenix_live_view → `writing-elixir` (+ `writing-phoenix` at the seam)
- `Cargo.toml` → `writing-rust`; `go.mod` → `writing-go`; make/cc → `writing-c`

Per slice: the single smallest skill covering its core layer; add the second only when the slice crosses a seam (e.g. a LiveView form writing through Ecto). Check from the repo, never from the ask — a Vue UI slice gets `writing-vue` even if the goal mentions the backend. Err on under-load; the critic catches what a missing skill would have caused.

Publish one issue per slice **in dependency order (blockers first)**:

- **GitHub/GitLab**: native blocking/sub-issue relationship where available, else a `Blocked by` list. Apply a `ready-for-agent` label.
- **Local**: `.scratch/<feature-slug>/issues/`, numbered from `01` in dependency order, each with a `Blocked by` list.

Issue template (UI-bearing slices add a Design reference section — it travels into the task brief and the review input, so workers match the committed design system and critics judge against it):

```markdown
## What to build
<the end-to-end behaviour this slice makes work, from the user's perspective — not a layer-by-layer implementation list>

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Design reference
<UI-bearing slices only: path to the committed design system (tokens, components) and the prototype or screen being built — e.g. Claude Design output committed to the repo. Omit for logic-only slices.>

## Blocked by
<reference(s), or "None — can start immediately">
```

Keep file paths and code snippets out of issue bodies — they go stale. That detail lives in the task brief, written at dispatch time.

## Phase 3 — COORDINATION.md

Create or refresh `<repo>/COORDINATION.md` — the single source of coordinator state. The table is a **live ledger**: `dispatched` only once the worker is actually spawned, `reviewed` only once the review gate passed, `merged` only after the merge lands. Record the per-slice skill manifest in the Skills column at dispatch time. Update before any user-facing status report; if you would report state not in the file, write it first.

```markdown
# Coordination — <goal>

Status: active | paused | done

## Goal
<one paragraph>

## Issues
| # | Title | Blocked by | Branch | Worker | Skills | PR | Status |
|---|-------|-----------|--------|--------|--------|----|--------|
| 1 | <title> | — | coord/1-<slug> | pi worker | writing-c | #12 | merged |

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
   default=$(git -C <repo> symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
   git -C <repo> fetch origin "$default"
   git -C <repo> worktree add -b coord/<n>-<slug> <wt> "origin/$default"
   ```
   Never `worktree remove --force` a path that has a working tree: a dirty or unidentified worktree may hold user work. To redo a slice, remove the previous worktree only after confirming it is clean, or ask the user.
2. **Spawn the worker** on the worktree, passing its `skills` manifest from Phase 2 explicitly to the subagent tool (spawn matrix below). Record the manifest in the ledger's Skills column the same turn.
3. Worker pushes the branch, opens a PR, and hands back.

### Spawn matrix (harness-agnostic)

| Worker | Coordinator is pi | Coordinator is another CLI |
|---|---|---|
| pi `worker` agent | `subagent` tool (parallel in a wave) | `pi -p "<task brief>"` headless, or interactive tmux pane |
| Claude Code | tmux/Herdr, supervised via the `shipwright` skill | `claude -p "<task brief>"`, or tmux pane |
| Codex | tmux/Herdr, supervised via the `shipwright` skill | `codex exec "<task brief>"`, or tmux pane |

Non-pi workers: load the `shipwright` skill and follow its launch/supervise/review contract — named tmux session `coord/<slug>`, worktree isolation, parent review gate, user-review handoff. pi workers: the `subagent` tool returns full transcripts and usage directly.

### Task brief template

```
Issue: <title> (#<n>)
Project: <worktree path>   (branch coord/<n>-<slug> already checked out — do not recreate)
Goal: <one line, in the project's vocabulary>
Scope: <what to change>   Out of scope: <what not to touch>
Skills: <the manifest applied at spawn for pi subagents; listed here for windowed/external workers only, where it is advisory>
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
- Review each PR from source, not the summary: read the full diff, run the tests independently, check scope creep and weakened tests. UI-bearing PRs are judged against the slice's Design reference — committed tokens and components, the prototype — never a hypothetical better design. Delegate a second pass to a reviewer agent if one exists.
- **Blocking** finding → correction to the same worker. **Non-blocking** → record for the user.
- All waves pass and the user approves → merge PRs in dependency order. The coordinator merges, never the workers. Conflicts → re-dispatch a worker on a fresh branch off merged main.

## Phase 6 — Close

- Update `COORDINATION.md`: status done, final table, decisions.
- Report: what shipped, which PRs merged, issues left open for the user to close (or offer close with approval).
- Give attach instructions for any live worker session.

## Visibility

- **pi workers**: expand the subagent tool result for the full transcript and per-turn usage.
- **tmux/CLI workers**: named session `coord/<slug>` — tell the user `tmux attach -t coord/<slug>`. Keep sessions alive until the PR is merged and the user is done with them.
- **State**: point the user at `COORDINATION.md`.