# Coordinator — Termdeck environment runbook

Load this file ONLY when the active environment is **termdeck**
(`termctl list` succeeds). The tmux runbook is
[env-tmux.md](env-tmux.md) — never load both.

## Layout

- One termdeck session; the coordinator runs **pi in the master pane**.
- Worker and critic get their own panes via `termctl open <dir>`; pane ids come
  from the opened directory basename (echoed by `open`). `termctl list --json`
  shows ids; the master pane has `"master": true`.
- The relay auto-resolves the master pane per pass, so the master may be
  promoted without touching the relay.

## termctl cheat sheet

```bash
termctl list                              # panes (id, path, master)
termctl open <dir>                        # spawn a pane (shell at <dir>)
termctl close <id> --force                # kill a pane
termctl input <id> --force --paste '…'    # inject text (--force REQUIRED)
termctl input <id> --force --keys $'\r'   # send Enter
termctl peek <id> --lines N               # read pane tail
termctl notify MSG                        # deck toast (caller's pane)
```

- `input` is refused without `--force` in this setup.
- To reuse a pane for a fresh session: `close` (force) then `open` again —
  the id may be reused or renumbered; re-list before use.

## Dispatch mechanics (all harnesses)

After prompt+Enter, ALWAYS capture the pane (`termctl peek <id>`):

- Submitting (working / codex running) → done.
- Pointer text still sitting at the shell prompt (unsubmitted) → send ONE
  more Enter (lost-Enter race); NEVER a second Enter while a turn shows
  Working (twin-ping duplicate).

## Workers (Codex)

```bash
termctl input 00-xyz --force --paste 'codex exec -m gpt-5.6-terra -s danger-full-access -C /path/to/worktree "Read .scratch/tasks/<slug>.brief.md in this repo and execute it end to end. The brief is your contract."'
termctl input 00-xyz --force --keys $'\r'
termctl peek 00-xyz --lines 10   # verify submission per rule above
```

- Codex launch ALWAYS passes `-m gpt-5.6-terra` (core rule — the codex config
  default `gpt-5.6-sol` silently wins otherwise).
- Worker panes may take >10s to show output after Enter; peek again before
  assuming failure.

## Critic and researcher panes (pi)

Create the pane (`termctl open <repo>`), then launch pi with a SINGLE-LINE
pointer (never multi-line pasted into a pi composer):

```bash
pi --provider opencode-go --model muse-spark-1.3-contributor \
   --skill <critic SKILL.md> -n critic \
   "review assignment: read <assignment file> and execute it …"
```

- Critic model/pins are core rules (provider+model pinned; the pane must show
  ONLY the critic skill).
- The critic returns its verdict in its pane — peek it after it settles; the
  critic does not ping.
- Researcher (on demand): same shape with the researcher skill; kill the pane
  (`close --force`) when the brief lands — never standing.

## Finish-protocol delivery (termdeck)

Script: coordinator skill `scripts/relay-termdeck.sh`. Run DETACHED, e.g.

```bash
setsid nohup scripts/relay-termdeck.sh >/dev/null 2>&1 &
```

`TERMDECK_DELIVERY` selects the mechanism:

- **`relay` (default)** — types the one-line ping into the master pane and
  presses Enter, so it arrives as a coordinator message. Guarded: only when
  the pane looks like pi idle (footer signature visible, no `Working` spinner,
  not in scrollback); otherwise DEFER+retry every 3s. Never injects into a
  busy pi or a plain shell.
- **`notify`** — experimental; NOT reliable yet (zo-ll/termdeck#111: toasts
  from a detached process attributed via `TERMDECK_PANE` are not visible in
  the deck). Default to `relay` until that issue closes. When chosen, emits
  `termctl notify "<task> done: <summary>"` (a human-visible signal) and
  consumes the ping; nothing is typed into pi.

Log: `/tmp/shipwright/relay-termdeck.log` (ARRIVE/DELIVER/DEFER/NOTIFY/DUP), pid
file `/tmp/shipwright/relay-termdeck.pid`.

Critic finish signal: review assignments tell the critic to write one line
`VERDICT <task>: <pass|handback> — <summary>` to
`/tmp/shipwright/inbox/<task>.critic.ping` on completion — same delivery path
as worker pings, so the critic wakes the coordinator instead of sitting unseen
in its pane.

Shell completion hooks (independent of the above): termdeck env
`TERMDECK_NOTIFY` = `none|error|long|all`, `TERMDECK_NOTIFY_LONG_SECS`.