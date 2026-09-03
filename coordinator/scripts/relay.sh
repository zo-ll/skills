#!/usr/bin/env bash
# Coordinator inbox relay — NOTIFY-ONLY (never injects keystrokes).
# Workers drop one-line files into $INBOX/<task>.ping (unchanged contract).
# This loop only (1) counts pending pings, (2) shows a passive status badge
#   via the session user option @shipwright_pending, (3) logs arrivals.
# The COORDINATOR drains the inbox itself at turn start (see SKILL.md Phase 5b:
#   cat + rm inbox/*.ping alongside the .scratch/status marker check).
# Rationale: send-keys into a live TUI shares one PTY input queue with the
# user's keystrokes — delivery interleaves mid-draft, the trailing Enter
# submits half-typed lines, and text fired during copy mode is silently eaten
# while Enter yanks the user out of scrollback. No idle heuristic closes that
# race (check-then-send is TOCTOU; tmux has no last-input timestamp), so the
# relay no longer targets any pane at all.
# Previous injecting version kept at relay.sh.injecting.bak for revert.
# Usage: run DETACHED (recommended), e.g.
#   setsid nohup <this script> >/dev/null 2>&1 &   (pid -> /tmp/shipwright/relay.pid)
# All activity is logged to /tmp/shipwright/relay.log for inspection.
INBOX=/tmp/shipwright/inbox
LOG=/tmp/shipwright/relay.log
COORD_SESSION="${TERMDECK_COORD_SESSION:-personal}"
mkdir -p "$INBOX"
ts() { date '+%Y-%m-%d %H:%M:%S'; }
echo "[relay started $(ts)] notify-only watching $INBOX (session $COORD_SESSION)" >>"$LOG"
# Idempotent one-time status integration: append badge token iff absent.
# (Reads the LIVE value, so distro/user status-right customisations survive.)
cur="$(tmux show-option -gv status-right 2>/dev/null || true)"
case "$cur" in
  *shipwright_pending*) ;;
  *) tmux set-option -g status-right "${cur}#{@shipwright_pending}" 2>/dev/null || true;;
esac
tmux set-option -t "$COORD_SESSION" @shipwright_pending "" 2>/dev/null || true
shopt -s nullglob
last=-1
seen=""
while true; do
  files=("$INBOX"/*.ping)
  n=${#files[@]}
  if [ "$n" != "$last" ]; then
    if [ "$n" -gt 0 ]; then
      tmux set-option -t "$COORD_SESSION" @shipwright_pending " ✉ $n" 2>/dev/null || true
    else
      tmux set-option -t "$COORD_SESSION" @shipwright_pending "" 2>/dev/null || true
    fi
    last="$n"
  fi
  state="$(printf '%s\n' "${files[@]}")"
  if [ "$state" != "$seen" ]; then
    comm -13 <(printf '%s\n' "$seen") <(printf '%s\n' "$state") 2>/dev/null \
      | while read -r f; do
          [ -n "$f" ] && printf '%s ARRIVE %-22s (pending=%s)\n' "$(ts)" \
            "$(basename "$f" .ping)" "$n" >>"$LOG"
        done
    seen="$state"
  fi
  sleep 3
done
