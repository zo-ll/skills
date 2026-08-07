# Harness adapters

The skill is harness-generic. Select commands from the installed CLI's own `--help`; do not assume flags from memory.

## Required worker behavior

The selected coding-agent CLI must:

- run with the isolated worktree as its working directory;
- receive a complete task prompt;
- have the repository permissions needed for the authorized task;
- leave all changes in the worktree;
- return or write a structured handoff; and
- avoid merge, push, worktree deletion, or unrelated external actions.

## Herdr interactive adapter

Herdr `agent start --kind` supports recognized kinds including `claude`, `codex`, `gemini`, `cursor`, `opencode`, and others exposed by `herdr agent start --help`. Pass harness-specific launch arguments only after checking the installed version.

Example shape:

```bash
herdr agent start worker --kind claude --pane "$PANE_ID" -- <verified-agent-args>
herdr agent prompt worker "$(cat "$PROMPT_FILE")"
```

Install the matching Herdr integration when available for stronger session/state reporting, but do not treat integration status as task correctness.

For an existing Herdr agent, do not run `agent start`. Inspect it with `agent get` and `agent read`, then use `agent prompt` to preserve the current conversation.

## tmux noninteractive adapter

The bundled tmux runner passes the prompt on stdin. Supply the harness executable and arguments as separate shell arguments after `--`.

Common command shapes, subject to installed-version verification:

```text
Claude Code: claude -p
Codex:       codex exec -
```

For a custom harness, create a small executable wrapper that reads stdin as the prompt, performs one agent turn, writes its answer to stdout, and exits with the true result code. Pass the wrapper path as the harness command. Do not embed complex quoting or secrets in a command string.

## Attached interactive adapter

An existing tmux pane may contain an interactive Claude, Codex, Gemini, Cursor, OpenCode, or custom agent. Inspect the pane rather than assuming its harness from the session name. Before pasting a task or correction:

1. Match `pane_current_command` to the user-specified agent executable.
2. Capture the pane and verify that the agent is waiting for input, not approving a command, editing text, or streaming output.
3. Use the bundled `prompt-target` action, which refuses a foreground-command mismatch and pastes the prompt as data rather than shell syntax.
4. Capture the pane again to verify that the prompt reached the intended agent.

If the CLI does not accept multiline pasted input safely, ask the user to submit the prepared prompt manually. Never fall back to typing an escaped shell command into the pane.

### Usage and quota checks

Inspect the installed harness and its interactive help rather than assuming a status command. Run checks only at an idle prompt so they cannot corrupt input or interrupt a tool call.

- Claude Code: prefer the interactive `/usage` status surface when present. Record remaining quota/credits and reset time shown by the UI.
- Other harnesses: use their documented local status or usage surface. If none exists, rely only on explicit UI warnings or user-provided provider data and label the result unknown.
- Never ask the coding model to estimate its own provider usage.

Usage checks do not prove task completion. Likewise, lifecycle state does not prove budget availability.

### Interrupting without destroying context

An explicit user stop request means cancel the active turn and stop sending prompts. Preserve the interactive process and conversation unless the user also asks to close them. With tmux, use `interrupt-target` after verifying the exact target and expected executable. With Herdr, use only an interrupt primitive confirmed by the installed CLI help; do not use workspace close, agent deletion, or pane destruction as a substitute.

## Permissions

Use the narrowest noninteractive permission mode that can complete the task. Never enable blanket external-network, destructive, or home-directory access merely to avoid an approval. If the worker needs new authority, let it become blocked and surface the exact request to the parent or user.
