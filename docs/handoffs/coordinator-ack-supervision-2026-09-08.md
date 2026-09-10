# Ack/supervision handoff — 2026-09-08

Started 20:40:10 +02:00; completed at approximately 20:46 +02:00, within
the 40-minute cap. All three brief items completed; nothing deferred.
No repository commits or tracked changes. Termdeck HEAD remains `3761337`.

## Completed

- Relay checks both tmux send statuses. It logs DELIVER and consumes a claim
  only after successful text and Enter sends. Failed phases log RETRY;
  three failures log FAILED and retain the event for operator recovery.
  Retries wait one second plus the ordinary three-second scan interval.
- A successful text send is remembered while Enter is retried. Other event
  sends wait so they cannot contaminate that pending input. Exhausted Enter
  retries pause delivery until operator recovery. Guard failures retain
  claims without consuming the send retry budget.
- Existing lock, atomic claim, first-line delivery, separate Enter, literal
  task/role/round dedupe, ARRIVE, and DEFER semantics are retained.
- Added read-only abort detection and a short provider-recovery protocol:
  bounded 10/20/40-second observations with 0–5-second jitter, one nudge
  after a verified idle abort, then escalation. Restart/model switch needs
  coordinator authorization; no fallback model or automatic nudge is baked in.
- Critic assignment and finish contracts require the full reviewed HEAD in
  verdict, marker, and report. Post-PASS behavioral changes need re-review;
  non-behavioral exceptions need an explicit old/new-head coordinator note.
  External edits also require reviewed-file hashes because HEAD alone does
  not describe uncommitted external files.

## Files changed

Under `/home/az/.pi/agent/skills/coordinator/`:

- `scripts/relay.sh`
- `scripts/check-aborted.sh` (new; invoke with bash)
- `scripts/test-check-aborted.py` (new)
- `references/finish-protocol.md`
- `references/env-tmux.md`
- `references/provider-recovery.md` (new)
- `SKILL.md` (critic assignment/verdict binding)
- `ack-supervision.notes.md` (this handoff)

The explicitly requested ignored test was extended at
`/home/az/.worktrees/termdeck/relay-fix/.scratch/tests/test_relay.py`.
The final marker is also under `.scratch/status/` as requested. Runtime
PID/log and inbox artifacts are external. Existing unrelated skills-repo
changes were not committed or modified by this task.

## Verification

- `bash -n` passed for relay and detector; scoped skills diff whitespace
  check passed. Shellcheck is unavailable and was not run.
- `python .scratch/tests/test_relay.py` passed, covering prior singleton,
  guard, retained-claim restart, one-line/Enter, round/role/changed-content,
  leading-dash and atomic-replacement cases, plus transient text failure,
  transient Enter failure, no text retyping, no interleaving while Enter is
  pending, guard recheck before retry, permanent text failure retained after
  three attempts, and permanent Enter failure blocking other delivery.
- `python scripts/test-check-aborted.py` passed: all four states, latest-cue
  ordering, shell-command echo exclusion, coordinator/unrelated-shell
  exclusion, capture/session error reporting, argument validation, and only
  read-only list/capture calls. Detection is heuristic, not a harness API.
- Live relay restarted at 20:44:56 +02:00 as PID 265383. Exact process check
  found one instance. Live probe `ack-supervision-probe.r1` logged ARRIVE
  and DELIVER at 20:44:59; its inbox and claimed files were consumed.
  Send failures were simulated only in the isolated test, not injected
  into the live coordinator's transport.
- `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`,
  and `cargo test --all-targets` passed. Tests: 488 library + 10 termctl +
  1 main. Log: `/tmp/shipwright/ack-supervision-cargo.log`. The nested
  panic-child FAILED line is intentional; all parent suites pass.
- Tracked Termdeck worktree is clean; no new commit, push, merge, PR, or
  tracker change.

Live detector output (20:45:43 +02:00):

```text
%1    critic       idle-ok
%24   claude       idle-ok
%26   codex        working
%20   researcher   retry-wait
```

No recovery nudge, restart, or model change was performed on these agent
panes. In particular, researcher `retry-wait` is a captured-text hint; it
is not independent proof that its provider is still retrying.

## Acknowledgment boundary and remaining limitations

This implements tmux send-acknowledgment, not durable agent acceptance or
exactly-once conversation processing. Claims survive ordinary relay
restart, but phase state, retry counts, and dedupe memory are process-local.
A crash after injection can replay; a failed transport can have uncertain
partial effects. Operators must inspect/reconcile composer input and claims
before restarting an exhausted Enter event. No disk-backed agent receipt or
automatic operator recovery is claimed.

Detector cues can be stale or quoted, and unknown harness indicators can
be missed. `idle-ok` does not mean task completion; verify marker, task,
and actual pane state. Provider fallback and content review remain explicit
coordinator decisions. Deferred brief items: none.
