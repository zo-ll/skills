---
name: shipwright
description: Delegate implementation, debugging, refactoring, testing, or documentation work to a new coding-agent CLI or attach to a running user-specified agent inside Herdr or tmux, then independently review and iterate before asking the user to review. Use when the user asks the main agent to hand work to Claude, Codex, or another agent; adopt or supervise an existing agent session; requests a reviewer loop, persistent pane, worktree workflow, tmux/Herdr orchestration; or asks the main agent to manage implementation rather than perform it directly.
---

# Shipwright

Supervise one worker in a persistent multiplexer. Either launch it in an isolated Git worktree or attach to the exact running agent named by the user. Remain the accountable lead: establish the task, monitor it, review the diff and tests independently, send corrections until it passes, then ask the user to review before integration.

## Non-negotiable contract

- Always create a visible persistent workspace or session. Do not use an invisible built-in subagent as the only worker.
- When the user specifies a running Herdr agent or tmux target, attach to that target instead of spawning a replacement. Do not silently select a different session.
- Keep every implementation prompt and correction in that attached agent. A separate window may host review commands, previews, or logs, but never a replacement worker or a fresh conversation unless the user explicitly asks for one.
- Prefer Herdr when installed; otherwise use tmux. Never nest Herdr and tmux for the same worker.
- Treat the worker as untrusted until its output, diff, tests, and claims are verified.
- For a new worker, keep changes isolated from the user's active checkout with a Git worktree unless the user explicitly requires the same worktree. For an attached worker, adopt its existing checkout after reporting its path, branch, and dirty state; never move it into a new worktree.
- Do not merge, cherry-pick, push, delete the worktree, or close the review workspace before user review unless the user already authorized that exact action.
- Treat an attached agent, pane, session, and checkout as user-owned. Never restart, kill, close, rename, or clean them up unless the user explicitly requests it.
- Ask the user to review only after the parent review gate passes. If it does not pass, return the work to the worker with concrete evidence.
- Do not implement the worker's fixes yourself while operating Shipwright. Return review findings and user feedback to the same worker unless the user explicitly changes the delegation arrangement.
- Preserve the session and worktree while the user reviews so they can inspect or attach.

## Preflight

1. Read repository instructions, the relevant specification/ticket, current status, and existing tests.
2. Establish one bounded deliverable and its acceptance checks. Delegate only work authorized by the user.
   Record any provider quota, credit budget, reset time, deadline, or user-requested stop threshold. Treat these as execution constraints, not implementation requirements.
3. Inspect the active worktree for unrelated changes. Never absorb them into the worker branch.
4. Choose the operating mode:

   - **Attach:** require the exact Herdr agent name or tmux target from the user. Resolve it, capture its current state, and verify its checkout before sending input. If the identifier is missing or ambiguous, ask instead of guessing.
   - **Launch:** choose a short task ID and create `agent/<task-id>` from the intended base:

```bash
scripts/worktree.sh create "$REPO" "$TASK_ID" "$BASE_REF"
```

5. Create a task state directory and a task prompt outside the repository:

    ```bash
    STATE_DIR="$(scripts/state-dir.sh path "$REPO" "$TASK_ID")"   # ${TMPDIR:-/tmp}/shipwright/<repo>/<task-id>
    mkdir -p "$STATE_DIR"
    # store task.md, correction-N.md, usage.txt, handoff.md here
    ```

    Use the contract in [references/task-contract.md](references/task-contract.md). In attach mode, account for work already performed and avoid reissuing completed work. Include the resolved checkout and relevant source paths.
6. Read [references/multiplexers.md](references/multiplexers.md), then select Herdr or tmux. Read [references/harnesses.md](references/harnesses.md) for the selected agent CLI.

## Attach to a running worker

Use this path whenever the user supplies an existing target. Do not also launch a worker.

### Existing Herdr agent

Resolve the exact agent name and inspect it before prompting:

```bash
scripts/herdr-agent.sh status "$AGENT_NAME"
scripts/herdr-agent.sh read "$AGENT_NAME" 160
```

From Herdr's returned agent, pane, and workspace data, determine the checkout path. In that checkout inspect `git status`, branch, remotes, instructions, and current diff. Confirm that the observed repository is the one in scope. Use `scripts/herdr-agent.sh prompt` for the assignment or correction only after reading the current transcript and lifecycle state.

### Existing tmux agent

Use the exact `session:window.pane` supplied by the user:

```bash
scripts/tmux-agent.sh inspect "$TMUX_TARGET"
scripts/tmux-agent.sh capture-target "$TMUX_TARGET" 160
```

Verify the reported pane command, PID, cwd, repository, branch, dirty state, and visible transcript. Refuse to type into a shell, editor, test process, or ambiguous pane. When the pane is visibly waiting for agent input, paste a prompt while requiring the expected foreground command:

```bash
scripts/tmux-agent.sh prompt-target \
  "$TMUX_TARGET" "$PROMPT_FILE" "$EXPECTED_AGENT_COMMAND"
```

Create a separate review window in the same tmux session when useful, but do not replace or rename the user's agent window. Because an attached turn lacks Shipwright's exit marker, determine settlement from the agent UI/transcript plus repository activity; never infer correctness from apparent idleness.

After attaching, continue at [Supervise without taking over](#supervise-without-taking-over).

## Usage budget and stop control

Keep worker progress, provider usage, and process lifecycle as three separate signals. An idle agent can still be near its quota; an active agent may be making no useful progress.

- Check usage at attachment/launch, before each correction turn, after a substantial worker turn, and roughly every 10–15 minutes during long runs when the provider exposes a usage surface. Also check immediately when the transcript shows a quota, credit, context, or reset warning.
- Query usage only while an interactive worker is visibly waiting for input. Use the installed harness's documented non-generative status command; for Claude Code, use `/usage` when the installed interactive version provides it. Capture the result and reset time. If no reliable usage command exists, report usage as unknown—never imply it was checked.
- Do not spend a worker turn merely to ask the model about its own token count. Provider UI/status output is authoritative; model estimates are not.
- When a limit is close, avoid opening a broad correction turn. Ask the worker for a concise handoff/checkpoint if that can be done safely, then perform parent-side review and tell the user what remains.
- When a limit is reached, stop prompting. Preserve the checkout, transcript, and exact next prompt so work can resume after reset.
- When the user says stop, interrupt the current generation/tool turn immediately and suspend worker prompting. Do not interpret this as permission to kill the attached pane, agent process, session, or checkout.

For an attached tmux worker, verify the target and foreground command, interrupt the active turn in place, then capture the pane until it is visibly idle:

```bash
scripts/tmux-agent.sh interrupt-target "$TMUX_TARGET" "$EXPECTED_AGENT_COMMAND"
scripts/tmux-agent.sh capture-target "$TMUX_TARGET" 80
```

For Herdr, inspect the installed CLI help and use its agent/pane-level interrupt operation if available. Never substitute workspace closure for turn interruption. If the installed version has no safe interrupt primitive, state that limitation and ask the user to interrupt from their attached UI.

## Launch a new worker

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
- At the usage checkpoints above, capture quota state without disrupting an active turn. Stop before the user-defined threshold rather than consuming the remaining budget speculatively.
- If the worker is blocked, read the actual prompt. Answer only decisions already authorized by the user; otherwise surface the question to the user.
- Do not edit the worker's files to rescue it while it is running. Give it the missing context or stop and restart deliberately.
- Route user design feedback and parent review findings back into the same attached conversation. Do not create a new worker window for follow-ups merely to obtain cleaner logs.
- Require a final handoff containing changed files, behavior, tests run, remaining risks, and any deviations from the task.
- Require a completion marker BEFORE the handoff so completion is observable without polling: the worker writes `<checkout>/.scratch/status/<task-slug>.done` (one line: `done TS=<YYYY-MM-DD HH:MM:SS> TASK=<slug> RESULT=<pass|handback|checkpoint|correction> SUMMARY=<...>`) and pings the coordinator with a one-line mini prompt (`<role>: finished <task-slug> <summary>`) via the same `prompt-target` mechanism the coordinator uses.
- For full-screen agents whose transcript is incomplete, instruct the worker to write its handoff to `$STATE_DIR/handoff.md`, then read that file directly.

## Parent review gate

After the worker settles, review from source—not just its summary:

1. Inspect `git status`, the complete diff, untracked files, and commit history in the worktree.
2. Re-read the acceptance contract and map every requirement to evidence.
3. Run proportionate formatting, static checks, unit tests, integration tests, and focused manual checks independently.
   Run preview servers and interactive inspection in a separate review window, never in the worker's pane. Keep implementation prompts in the original attached conversation.
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
- Herdr workspace/agent or exact tmux attach target;
- changed-file and architecture summary;
- verification commands and results;
- known non-blocking risks or design questions; and
- the exact next action available: request changes, approve integration, or inspect live.

Do not imply integration already occurred. Keep the multiplexer and worktree alive until the user responds.

## After user review

- On requested changes, send a new prompt to the same Herdr agent or a new tmux correction window, then repeat the parent gate.
- On approval, integrate only through the repository's preferred process and only with user authorization.
- After integration is verified, close a Shipwright-created workspace/session and remove its worktree with `scripts/worktree.sh remove`. The removal script refuses dirty worktrees. Leave attached user-owned agents, panes, sessions, and checkouts running and intact unless the user explicitly asks to close them.
- Retain task prompts, logs, and review evidence until integration is complete; then remove temporary state deliberately: `scripts/state-dir.sh remove "$REPO" "$TASK_ID"`.
