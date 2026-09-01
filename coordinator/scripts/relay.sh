#!/usr/bin/env bash
# Coordinator inbox relay: delivers ONE-LINE pings from sandboxed workers
# into the coordinator's conversation.
# - new-files-only, consumed once after delivery (no stale re-fires)
# - single line only (no multiline corruption)
# - guarded: only when the coordinator pane's foreground command is `pi`
# Usage: run DETACHED (recommended), e.g.
#   setsid nohup <this script> >/dev/null 2>&1 &   (pid -> /tmp/shipwright/relay.pid)
# or in a tmux window during debugging:
#   tmux new-window -d -t <session> -n relay -c /tmp/shipwright '<this script>'
# All activity is logged to /tmp/shipwright/relay.log for inspection.
INBOX=/tmp/shipwright/inbox
LOG=/tmp/shipwright/relay.log
COORD_PANE="${TERMDECK_COORD_PANE:-personal:coordinator.0}"
mkdir -p "$INBOX"
echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')] watching $INBOX -> $COORD_PANE"
echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')]" >> "$LOG"
shopt -s nullglob
while true; do
  for f in "$INBOX"/*.ping; do
    [ -f "$f" ] || continue
    content="$(head -n 1 "$f" | tr -d '\r')"
    [ -n "$content" ] || { rm -f "$f"; continue; }
    cmd="$(tmux display-message -p -t "$COORD_PANE" '#{pane_current_command}' 2>/dev/null || true)"
    if [ "$cmd" = "pi" ]; then
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      printf '%s DELIVER %-22s :: %s\n' "$ts" "$(basename "$f" .ping)" "$content" | tee -a "$LOG"
      tmux send-keys -t "$COORD_PANE" -l "$content" 2>/dev/null || true
      tmux send-keys -t "$COORD_PANE" Enter 2>/dev/null || true
      rm -f "$f"
    fi
    # if the pane is not pi, leave the file and retry next pass
  done
  sleep 3
done