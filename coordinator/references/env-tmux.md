# Coordinator — Tmux environment runbook

Load this file when the active environment is **tmux** (`tmux list-sessions`
succeeds). This is the coordinator's environment runbook.

## Working environment

Standard layout, one tmux session (`personal`; attach: `tmux attach -t personal`):

| # | Window | Runs | Spec |
|---|--------|------|------|
| 0 | coordinator | pi (the coordinator role) | the coordinator's own pane; state lives in COORDINATION.md |
| 1 | critic | pi | the `critic` skill loaded and NO other skills; model MUST be pinned (core rule — bare `muse-spark-1.3` matches a keyless -free variant) |
| 2 | claude lane | claude --model opus --effort high --dangerously-skip-permissions | worker: UI lane |
| 3 | codex lane | codex -m gpt-5.6-terra -c model_reasoning_effort=high -s danger-full-access -a never --no-alt-screen | worker: engine/CLI/infra lane |

The CRITIC window must show ONLY the critic skill — never a plain shell,
never a full-skill pi (both have broken takeovers).

## Startup recipes (used exactly)

- critic = `pi --provider opencode-go --model muse-spark-1.3-contributor --skill <critic SKILL.md> -n critic "$(cat critic-boot)"`
- claude and codex as the table shows.

## On-demand researcher (NOT part of the default env)

Spawn ONLY when the user asks to research a feature:

```bash
tmux new-window -d -t personal -n researcher -c <repo> \
  'pi --model muse-spark-1.3 --skill <researcher SKILL.md> -n researcher "$(cat researcher-boot)"'
```

then dispatch via the research protocol (`references/research-protocol.md`).
Kill the window when the brief lands (`tmux kill-window -t personal:4`) — the
researcher is never standing. Other on-demand windows (horizon daemons, etc.)
follow the same rule: create when needed, remove when done.

## Delivery (finish protocol)

- The relay must be running detached, from coordinator skill `scripts/relay.sh`
  (default target `personal:coordinator.0`; override with
  `RELAY_COORD_PANE`). Pings arrive in the inbox
  (`/tmp/shipwright/inbox/<task>.ping`) and are typed into the coordinator
  pane when its foreground command is `pi` and not in copy mode; otherwise
  DEFER+retry. See `references/finish-protocol.md`.

## Dispatch capture (tmux)

For provider stalls, run `bash scripts/check-aborted.sh personal` from the
coordinator skill directory and follow [provider recovery](provider-recovery.md).
The helper is read-only; its status is a triage hint, not a completion gate.

After prompt-target + Enter, ALWAYS capture the pane:

- `tmux display-message -p -t <pane> '#{pane_current_command}'` identifies
  WHICH application is open. `codex`/`claude` alone does not prove a turn
  was accepted; either can be idle at its prompt.
- Capture with `tmux capture-pane -p -t <pane>` and look for an actual
  Working/thinking indicator for the submitted turn, or an explicit task
  acknowledgment. Only then treat dispatch as accepted. An ambiguous
  capture calls for another observation, not another Enter.
- Pointer still at the prompt (unsubmitted) → ONE more Enter (lost-Enter race);
  never a second Enter while the pane shows Working (twin-ping duplicate).
- pi panes receive prompts ONLY as a SINGLE LINE pointer to a file — never
  multi-line content pasted into a pi composer (pi fragments pasted newlines).
