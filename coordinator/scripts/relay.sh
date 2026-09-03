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
deferred=""
prev=""
while true; do
  # Arrival log: once per newly-seen file, regardless of guard outcome.
  cur="$(printf '%s\n' "$INBOX"/*.ping)"
  if [ "$cur" != "$prev" ]; then
    comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur") 2>/dev/null \
      | while read -r nf; do
          [ -n "$nf" ] && [ -f "$nf" ] && printf '%s ARRIVE %-22s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$(basename "$nf" .ping)" | tee -a "$LOG"
        done
    prev="$cur"
  fi
  for f in "$INBOX"/*.ping; do
    [ -f "$f" ] || continue
    content="$(head -n 1 "$f" | tr -d '\r')"
    [ -n "$content" ] || { rm -f "$f"; continue; }
    cmd="$(tmux display-message -p -t "$COORD_PANE" '#{pane_current_command}' 2>/dev/null || true)"
    mode="$(tmux display-message -p -t "$COORD_PANE" '#{pane_in_mode}' 2>/dev/null || true)"
    if [ "$cmd" = "pi" ] && [ "$mode" = "0" ]; then
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      printf '%s DELIVER %-22s :: %s\n' "$ts" "$(basename "$f" .ping)" "$content" | tee -a "$LOG"
      tmux send-keys -t "$COORD_PANE" -l "$content" 2>/dev/null || true
      tmux send-keys -t "$COORD_PANE" Enter 2>/dev/null || true
      rm -f "$f"
      deferred="${deferred//$(basename "$f")/}"
    else
      # Guard failed: never inject, never delete. Log DEFER once per file
      # (not every pass — a waiting file would spam the log at 20 lines/min),
      # leave the file, retry next pass.
      name="$(basename "$f")"
      case "$deferred" in
        *"$name"*) ;;
        *) printf '%s DEFER  %-22s :: cmd=%s mode=%s (left for retry)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$name" "$cmd" "$mode" | tee -a "$LOG"
           deferred="$deferred $name";;
      esac
    fi
    # if the pane is not pi, or is in copy mode, leave the file and retry next pass
  done
  sleep 3
done
