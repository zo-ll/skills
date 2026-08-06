# Multiplexer adapters

Use exactly one multiplexer as the worker control plane.

## Selection

1. Use Herdr when `command -v herdr` succeeds and the installed CLI supports `workspace`, `worktree`, `agent`, `pane`, and `tab` commands.
2. Otherwise use tmux when `command -v tmux` succeeds.
3. If neither exists, stop and ask the user to install one. Do not silently fall back to an invisible process.

Do not run tmux inside Herdr for the same worker. Herdr sees the nested tmux process rather than the agent and loses agent-aware lifecycle detection.

## Herdr model

- One worktree workspace per delegated task.
- Root pane contains the worker agent.
- Add a `review` tab for tests, servers, or parent-visible diagnostics.
- Address the worker by stable agent name after `agent start`.
- Use `agent prompt` for initial and correction turns, `agent wait` for lifecycle, and `agent read` for transcript capture.
- Treat `blocked` as requiring inspection, `done`/`idle` as settled, and `unknown` as inconclusive.
- Capture IDs from JSON results; never predict workspace, tab, or pane IDs.
- Keep the workspace open through user review. `workspace close` closes Herdr state but does not remove the Git checkout.

Useful direct commands:

```bash
herdr workspace list
herdr agent get worker
herdr agent wait worker --until idle --until done --until blocked --timeout 60000
herdr agent read worker --source recent-unwrapped --lines 160
herdr tab create --workspace "$WORKSPACE_ID" --cwd "$WORKTREE" --label review --no-focus
herdr pane run "$REVIEW_PANE" "cargo test --workspace"
```

Herdr commands return JSON for creation and agent operations. `jq` is required by the bundled adapter.

## tmux model

- One named session per delegated task.
- One immutable-log window per worker turn: `worker`, `worker-2`, and so on.
- Add separate `review`, `tests`, or `server` windows as needed.
- Detect completion from `__SUPERVISED_EXIT__:<code>` in the turn log, never by guessing from screen text.
- Use `capture-pane` for live visibility and log files for the complete result.
- Keep the session alive through user review.

Useful direct commands:

```bash
tmux list-windows -t "$SESSION"
tmux capture-pane -p -S -160 -t "$SESSION:worker"
tmux new-window -t "$SESSION" -n review -c "$WORKTREE"
tmux attach-session -t "$SESSION"
```

Do not send shell text to a pane unless its foreground process and prompt state are known. Prefer a new logged worker window for correction turns.
