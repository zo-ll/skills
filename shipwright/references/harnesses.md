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

## tmux noninteractive adapter

The bundled tmux runner passes the prompt on stdin. Supply the harness executable and arguments as separate shell arguments after `--`.

Common command shapes, subject to installed-version verification:

```text
Claude Code: claude -p
Codex:       codex exec -
```

For a custom harness, create a small executable wrapper that reads stdin as the prompt, performs one agent turn, writes its answer to stdout, and exits with the true result code. Pass the wrapper path as the harness command. Do not embed complex quoting or secrets in a command string.

## Permissions

Use the narrowest noninteractive permission mode that can complete the task. Never enable blanket external-network, destructive, or home-directory access merely to avoid an approval. If the worker needs new authority, let it become blocked and surface the exact request to the parent or user.
