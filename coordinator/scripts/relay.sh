#!/usr/bin/env bash
# Coordinator inbox relay: delivers ONE-LINE pings from sandboxed workers
# into the coordinator's conversation.
# - new-files-only, consumed once after delivery (no stale re-fires)
# - dedupes by task slug for this process lifetime (log: DUP)
#   so re-writing a ping with different wording cannot deliver it twice
# - single line only (no multiline corruption)
# - guarded: only when the coordinator pane's foreground command is `pi`
# Usage: run DETACHED (recommended), e.g.
#   setsid nohup <this script> >/dev/null 2>&1 &   (pid -> /tmp/shipwright/relay.pid)
# or in a tmux window during debugging:
#   tmux new-window -d -t <session> -n relay -c /tmp/shipwright '<this script>'
# All activity is logged to /tmp/shipwright/relay.log for inspection.
INBOX=/tmp/shipwright/inbox
LOG=/tmp/shipwright/relay.log
COORD_PANE="${RELAY_COORD_PANE:-personal:coordinator.0}"
mkdir -p "$INBOX"
exec 9>/tmp/shipwright/relay.lock
if ! flock -n 9; then
  printf '%s\n' 'relay already running (lock held)' >&2
  exit 1
fi
CLAIMED="$INBOX/.claimed"
mkdir -p "$CLAIMED"
echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')] watching $INBOX -> $COORD_PANE"
echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')]" >> "$LOG"
shopt -s nullglob
deferred=""
prev=""
delivered=""
declare -A failures=()
declare -A typed=()
active=""
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
    claimed="$CLAIMED/$(basename "$f")"
    [ ! -e "$claimed" ] || continue
    mv -T -- "$f" "$claimed" 2>/dev/null || continue
  done
  for f in "$CLAIMED"/*.ping; do
    [ -f "$f" ] || continue
    key="$(basename "$f" .ping)"
    [ -z "$active" ] || [ "$active" = "$key" ] || continue
    [ "${failures[$key]:-0}" -lt 3 ] || continue
    content="$(head -n 1 "$f" | tr -d '\r')"
    [ -n "$content" ] || { rm -f "$f"; continue; }
    cmd="$(tmux display-message -p -t "$COORD_PANE" '#{pane_current_command}' 2>/dev/null || true)"
    mode="$(tmux display-message -p -t "$COORD_PANE" '#{pane_in_mode}' 2>/dev/null || true)"
    if [ "$cmd" = "pi" ] && [ "$mode" = "0" ]; then
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      if printf '%s\n' "$delivered" | grep -Fqx -- "$key"; then
        printf '%s DUP    %-22s :: dropped (already delivered)\n' "$ts" "$(basename "$f" .ping)" | tee -a "$LOG"
        rm -f "$f"
      else
        stage=text
        sent=false
        if [ "${typed[$key]:-0}" = 1 ] || tmux send-keys -t "$COORD_PANE" -l "$content" 2>/dev/null; then
          typed[$key]=1
          active="$key"
          stage=Enter
          if tmux send-keys -t "$COORD_PANE" Enter 2>/dev/null; then
            sent=true
          fi
        fi
        if [ "$sent" = false ]; then
          failures[$key]=$(( ${failures[$key]:-0} + 1 ))
          outcome=RETRY
          [ "${failures[$key]}" -lt 3 ] || outcome=FAILED
          printf '%s %-7s %-22s :: stage=%s attempt=%s/3 (claim retained)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$outcome" "$key" "$stage" "${failures[$key]}" | tee -a "$LOG"
          sleep 1 9>&-
          continue
        fi
        printf '%s DELIVER %-22s :: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$key" "$content" | tee -a "$LOG"
        rm -f "$f"
        delivered="$(printf '%s\n%s' "$delivered" "$key")"
        deferred="${deferred//$(basename "$f")/}"
        unset 'failures[$key]' 'typed[$key]'
        active=""
      fi
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
  sleep 3 9>&-
done
