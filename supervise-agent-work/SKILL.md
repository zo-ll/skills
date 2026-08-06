---
name: supervise-agent-work
description: Delegate implementation, debugging, refactoring, testing, or documentation work to another coding-agent CLI inside a persistent Herdr workspace or tmux session, then independently review and iterate on its work before asking the user to review. Use when the user asks the main agent to hand work to Claude, Codex, or another agent; requests a supervised subagent, reviewer loop, persistent pane, worktree workflow, tmux/Herdr orchestration, or asks the main agent to manage implementation rather than perform it directly.
---

# Supervise Agent Work

Run one worker in an isolated Git worktree and a persistent multiplexer. Remain the accountable lead: specify the task, monitor it, review the diff and tests independently, send corrections until it passes, then ask the user to review before integration.

## Non-negotiable contract

- Always create a visible persistent workspace or session. Do not use an invisible built-in subagent as the only worker.
- Prefer Herdr when installed; otherwise use tmux. Never nest Herdr and tmux for the same worker.
- Treat the worker as untrusted until its output, diff, tests, and claims are verified.
- Keep worker changes isolated from the user's active checkout with a Git worktree unless the user explicitly requires the same worktree.
- Do not merge, cherry-pick, push, delete the worktree, or close the review workspace before user review unless the user already authorized that exact action.
- Ask the user to review only after the parent review gate passes. If it does not pass, return the work to the worker with concrete evidence.
- Preserve the session and worktree while the user reviews so they can inspect or attach.

## Preflight

1. Read repository instructions, the relevant specification/ticket, current status, and existing tests.
2. Establish one bounded deliverable and its acceptance checks. Delegate only work authorized by the user.
3. Inspect the active worktree for unrelated changes. Never absorb them into the worker branch.
4. Choose a short task ID and create `agent/<task-id>` from the intended base:

```bash
scripts/worktree.sh create "$REPO" "$TASK_ID" "$BASE_REF"
```

5. Create a task prompt outside the repository. Use the contract in [references/task-contract.md](references/task-contract.md). Include absolute paths to the isolated worktree and relevant source files.
6. Read [references/multiplexers.md](references/multiplexers.md), then select Herdr or tmux. Read [references/harnesses.md](references/harnesses.md) for the selected agent CLI.

## Launch the worker

### Herdr preferred

Use Herdr for agent-aware lifecycle, persistent workspaces, review tabs, and follow-up prompts:

```bash
scripts/herdr-agent.sh start \
  "$REPO" "$WORKTREE" "$TASK_ID" worker "$AGENT_KIND" "$PROMPT_FILE"
```

The worker remains addressable by name. Use:

```bash
scripts/herdr-agent.sh status worker
scripts/herdr-agent.sh wait worker 60000
scripts/herdr-agent.sh read worker 160
scripts/herdr-agent.sh prompt worker "$CORRECTION_PROMPT"
```

Herdr is authoritative only for process lifecycle, not task correctness. `idle`, `done`, or `blocked` never means the implementation is good.

### tmux fallback

The harness command must read the task from stdin and edit the worktree:

```bash
scripts/tmux-agent.sh start \
  "$SESSION" worker "$WORKTREE" "$PROMPT_FILE" "$LOG_FILE" \
  -- "$HARNESS" "${HARNESS_ARGS[@]}"
```

Use a new window for each correction turn so logs stay attributable:

```bash
scripts/tmux-agent.sh status "$SESSION" worker "$LOG_FILE"
scripts/tmux-agent.sh capture "$SESSION" worker 160
scripts/tmux-agent.sh start "$SESSION" worker-2 "$WORKTREE" "$CORRECTION_PROMPT" "$LOG_2" -- "$HARNESS" "${HARNESS_ARGS[@]}"
```

Tell the user how to attach when useful:

```bash
tmux attach-session -t "$SESSION"
```

## Supervise without taking over

- Confirm launch immediately and verify the worker is running.
- Poll state or output in intervals no longer than 60 seconds while actively waiting. Send concise progress updates to the user.
- If the worker is blocked, read the actual prompt. Answer only decisions already authorized by the user; otherwise surface the question to the user.
- Do not edit the worker's files to rescue it while it is running. Give it the missing context or stop and restart deliberately.
- Require a final handoff containing changed files, behavior, tests run, remaining risks, and any deviations from the task.
- For full-screen agents whose transcript is incomplete, instruct the worker to write its handoff to the task state directory, then read that file directly.

## Parent review gate

After the worker settles, review from source—not just its summary:

1. Inspect `git status`, the complete diff, untracked files, and commit history in the worktree.
2. Re-read the acceptance contract and map every requirement to evidence.
3. Run proportionate formatting, static checks, unit tests, integration tests, and focused manual checks independently.
4. Review architecture, domain semantics, error handling, security, compatibility, migrations, documentation, and unrelated changes.
5. Check that tests fail for the intended reason before the fix when feasible, and that they cover meaningful behavior rather than implementation trivia.
6. Verify the worker did not weaken tests, hide failures, change scope, leak secrets, or leave generated/temp artifacts.

Classify findings:

- **Blocking:** incorrect behavior, missing requirement, unsafe change, failing verification, unexplained scope, or unverifiable claim. Return to the worker.
- **Non-blocking:** polish that does not threaten the acceptance contract. Record it for the user.

Write a correction prompt containing exact evidence, expected behavior, constraints, and required reruns. Do not prescribe an implementation unless the constraint demands it. Repeat the worker/review loop until no blocking finding remains. After three failed correction turns for the same issue, stop and ask the user rather than cycling indefinitely.

## User review handoff

Only after the parent gate passes, ask the user to review. Provide:

- concise outcome and behavior;
- isolated branch and worktree path;
- Herdr workspace/agent or tmux attach command;
- changed-file and architecture summary;
- verification commands and results;
- known non-blocking risks or design questions; and
- the exact next action available: request changes, approve integration, or inspect live.

Do not imply integration already occurred. Keep the multiplexer and worktree alive until the user responds.

## After user review

- On requested changes, send a new prompt to the same Herdr agent or a new tmux correction window, then repeat the parent gate.
- On approval, integrate only through the repository's preferred process and only with user authorization.
- After integration is verified, close the workspace/session and remove the worktree with `scripts/worktree.sh remove`. The removal script refuses dirty worktrees.
- Retain task prompts, logs, and review evidence until integration is complete; then remove temporary state deliberately.
