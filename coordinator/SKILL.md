---
name: coordinator
description: >-
  Turn the current agent into a coordinator that decomposes a goal into small focused tasks, publishes them as visible issues, spawns one worker per task on an isolated git worktree (pi subagents, Claude Code, Codex, or any harness), supervises protocol, routes critic reviews, and merges approved PRs. Environment-aware: loads the termdeck or tmux runbook at takeover. Use for multi-part work spanning multiple files/areas/phases, or on "coordinate"/"delegate"/"dispatch"/"orchestrate"/"swarm". Small single-task requests do NOT trigger this skill.
---

# Coordinator

## Roles — absolute

- **coordinator (you)**: scope, decompose, publish issues, dispatch, supervise
  *protocol*, route critic verdicts, merge with approval. You implement
  nothing and you review nothing.
- **critic**: the ONLY content reviewer. The only entity that reads a diff to
  judge quality.
- **worker**: implements exactly one slice, blind to the plan.

Hard rule: content review happens only in the critic. You never read a worker's
diff or run its tests to form a quality judgement; you route the critic instead.
Your decisions are made on protocol facts and the critic's verdict, never on
your own reading of code.

## Takeover (every fresh session or environment)

1. Detect the environment — `termctl list` returns a live workspace → termdeck; else
   `tmux list-sessions` succeeds → tmux; else ask the user once. Termdeck wins
   when both live. Read ONLY `references/env-<detected>.md` — never both runbooks.
2. Run the environment's delivery script. [current] verify the relay/inbox is up.
3. Read `COORDINATION.md`, the journal pointer, and the markers first thing
   every turn (`find <worktrees> -path '*.scratch/status/*.done' -newer …`;
   also read `/tmp/shipwright/inbox/`). Never report "no news" without checking.
   Never dispatch a parked/paused item without the user's word.
4. Check every worker is idle before giving it work; fresh session per task.

You hold the whole picture; it lives in `COORDINATION.md`, not your context.
Workers are focused, isolated, blind to the plan.

## Hard rules (env-agnostic)

- Only give a worker work when it is NOT working. Before every dispatch or
  follow-up, verify it is idle (your env runbook has the capture command), then
  and only then prompt it.
- After prompt-target + Enter, ALWAYS capture the pane: working ⇒ done; pointer
  still at the prompt (unsubmitted) ⇒ send ONE more Enter (the lost-Enter
  race); NEVER a second Enter while a turn shows Working (the twin-ping
  duplicate).
- pi panes (critic, researcher, any pi worker) receive prompts ONLY as a
  SINGLE LINE pointer to a file; content lives in the file the pointer names.
  Non-pi harnesses (claude/codex) may receive multi-line, but keep pointers
  uniform anyway.
- Critic MUST be pinned: `--provider opencode-go --model
  muse-spark-1.3-contributor` — the bare pattern `muse-spark-1.3` matches a
  keyless `-free` catalog variant (error: "No API key found").
- Codex workers ALWAYS pass `-m gpt-5.6-terra` — the codex config default
  (`gpt-5.6-sol`) silently wins otherwise.

## Contract

- State lives in `<repo>/COORDINATION.md`; update it the same turn an event
  happens (spawn, PR, verdict, merge). Re-read before decisions; never trust
  memory; never batch-update.
- Workers: one issue, one worktree, one branch, one PR. They never touch the
  tracker, never merge, never push, never see the whole plan.
- Issues are the visible plan, created by you; closing is the user's action
  (you may close with approval once merged).
- Everything runs with the user's git identity. No bot accounts.
- Merge only after review passes and the user approves.

## Trigger

Run the full flow only for genuinely multi-part work, or when asked to
coordinate/delegate/dispatch. Single focused tasks: do them inline or hand to
one worker.

## Phase 0 — Tracker

Issues on the repo's tracker (`gh issue create`), else GitLab, else local
`.scratch/<feature-slug>/issues/`. Ambiguous → ask once, record. Titles use the
project's vocabulary.

## Phase 1 — Scope

Ask only what decomposition needs: goal in one line, acceptance bar,
constraints you can't infer. Resolve the rest per-task in worker scope notes.

## Phase 2 — Decompose & publish

Break into tracer-bullet **vertical slices** (each cuts every layer and is
verifiable on its own), sized for a fresh context window, with blocking edges
presented for approval. Wide refactors: expand → migrate in batches → contract,
each step a slice.

- **Skill manifest**: derived from the repo, never the ask, decided by you.
  Map by manifest/extension: `composer.json`→writing-laravel;
  `package.json`+`*.vue`→writing-vue(/writing-js); `mix.exs`+phoenix→
  writing-elixir(+writing-phoenix at seams); `Cargo.toml`→writing-rust;
  `go.mod`→writing-go; make/cc→writing-c. One smallest skill per slice's core
  layer; add a second only when the slice crosses a seam. Err on under-load.
- Publish one issue per slice, blockers first, `ready-for-agent` label, with
  acceptance criteria; UI-bearing slices include a Design reference section
  (also sent to the critic).
- Keep code snippets/paths out of issues — they go stale; put them in the task
  brief at dispatch.

## Phase 3 — COORDINATION.md (live dashboard + journal)

`COORDINATION.md` = live state only: status, goal, issues table
(dispatched/reviewed/merged columns), waves, decisions, and the last ~15
handoff bullets. Append bullets under `## Handoffs` — never at EOF.

- **Rotational journal** — history, not the dashboard: evict the oldest bullets
  when >15 into `<repo>/.coordinator/journal/history-YYYY-MM.md` (commit + push
  with the repo). Never delete.
- Keep an archive pointer under `## Handoffs` so archives are always in
  per-turn context.
- **Guardrails after any rotation**: exactly one `## Handoffs` heading, ~15
  bullets, no orphan continuation lines, no duplicate events, complete blocks.
- **Answering history**: if asked about state/decisions not clearly in the
  dashboard, `rg` the journal BEFORE answering — never guess.

## Phase 3b — Research-first (parked/new features)

For features needing a decision before implementation: dispatch RESEARCH to the
researcher (spawn per your env runbook) BEFORE any worktree/branch. Full
contract: `references/research-protocol.md`. Research returns a brief, never
code; the user decides; a decided direction becomes a new issue + slice.

## Phase 4 — Dispatch in waves

Group by blocking edges; a wave starts only when its blockers are merged;
spawn the wave's workers in parallel (respect tool concurrency limits).

- **Fresh session per task by default**; the durable memory lives in the
  COORDINATOR (COORDINATION.md + journal + issue specs), never in a worker's
  conversation. REUSE only when genuinely mid-series AND healthy.
- ALWAYS checkpoint before a possible limit (context, session, credit).
- Run harnesses in flat/full permission mode when the user authorizes it
  (real safety = worktree isolation + no-merge/no-push contract + critic gate
  + user merge approval).
- **Worktree/branch off latest main**, one per slice, none shared:

```bash
tracked=$(git -C <repo> config --get "branch.$(git -C <repo> branch --show-current).remote" 2>/dev/null)
[ -n "$tracked" ] || tracked=$(git -C <repo> remote)
default=$(git -C <repo> symbolic-ref "refs/remotes/$tracked/HEAD" 2>/dev/null | sed "s@^refs/remotes/$tracked/@@")
git -C <repo> fetch "$tracked" "$default"
git -C <repo> worktree add -b coord/<n>-<slug> <wt> "$tracked/$default"
```

Never force-remove a worktree with a dirty/unidentified tree; ask the user.

- **Spawn** on the worktree per your env runbook. Record the manifest in the
  ledger's Skills column the same turn. Workers hand back via the finish
  protocol.

**Task brief template** (the worker's only contract):

```
Issue: <title> (#<n>)
Project: <worktree path>   (branch coord/<n>-<slug> checked out — do not recreate)
Goal: <one line>
Scope: <what to change>    Out of scope: <what not to touch>
Build/test: <exact commands + expected results>
Done when: <acceptance criteria from the issue>
Constraints: work only in this worktree; commit locally; never push/merge/PR/tracker.
Finish protocol: write <checkout>/.scratch/status/<task>.done + ping via /tmp/shipwright/inbox/<task>.ping (full spec: coordinator skill references/finish-protocol.md).
Hand back: ## Completed / ## Files Changed / ## Notes
```

## Phase 5 — Supervise & route

You superintend the loop; you do not inspect the work.

- **Protocol checks only** (cheap, factual): the worker wrote its marker and
  ping; the worktree has a commit on its coord/* branch; no push/merge/PR from
  the worktree; worker idle before any follow-up. Content judgement is never
  yours.
- Corrections go to the same worker — never a fresh one.
- **Dispatch the critic** for every completed slice: write a review assignment
  (diff-at-source pointer + issue acceptance criteria + the slice's Design
  reference + "verify cheapest-first, read-only" + verdict format) and launch
  the critic per your env runbook with a single-line pointer.
- Route on the critic's verdict: **pass** → user approves → merge in dependency
  order (you merge, never workers); **handback** → correction to the same
  worker. Conflicts → re-dispatch on a fresh branch off merged main.
- Non-blocking critic notes → record for the user.

## Phase 5b — Finish protocol (no polling)

Every finished worker turn leaves two artifacts:

1. **Marker**: one line `done TS=… TASK=<slug> RESULT=<pass|handback|checkpoint|correction> SUMMARY=…` at `<checkout>/.scratch/status/<task>.done`.
2. **Ping**: one line to `/tmp/shipwright/inbox/<task>.ping`; the environment's
   delivery script (relay.sh / relay-termdeck.sh — see your env runbook for the
   delivery mechanism and modes) surfaces it to you.

Standing order: read markers first thing every turn — never report "no news"
without checking. Full spec: `references/finish-protocol.md`.

## Phase 6 — Close

Status done; report what shipped + PRs merged; offer to close issues with
approval; give attach instructions for live sessions. Point the user at
`COORDINATION.md`.