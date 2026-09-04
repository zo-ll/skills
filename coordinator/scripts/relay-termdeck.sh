#!/usr/bin/env bash
# Termdeck coordinator inbox relay — termdeck replacement for relay.sh (tmux).
#
# Delivers ONE-LINE pings from workers (/tmp/shipwright/inbox/*.ping) either
# into the coordinator's pi conversation (relay mode, default) or as a deck
# toast (notify mode). Select with TERMDECK_DELIVERY=relay|notify.
#
# relay mode: types the line into the termdeck master pane (where the
# coordinator runs) and presses Enter. Guard: only when the coordinator pane
# looks like pi IDLE at its prompt —
#   - the pane tail must show pi's footer signature (usage "↑…" + "(provider) model • level")
#   - and must NOT show the "Working" bar / braille spinner (busy), or scroll mode
#   (pi hides composer+footer in scrollback, so the signature check covers it).
# Otherwise the ping is DEFERRED (logged once) and retried every pass.
#
# notify mode: emits `termctl notify "<task> done: <summary>"` (human-visible
# toast), consumes the ping, types nothing into the coordinator pane.
#
# Usage: run DETACHED, e.g.
#   setsid nohup <this script> >/dev/null 2>&1 &   (pid -> /tmp/shipwright/relay-termdeck.pid)
# Override the target pane: TERMDECK_COORD_PANE=<pane-id> <this script>
# Log: /tmp/shipwright/relay-termdeck.log
set -u
INBOX=/tmp/shipwright/inbox
LOG=/tmp/shipwright/relay-termdeck.log
DELIVERY="${TERMDECK_DELIVERY:-relay}"
mkdir -p "$INBOX"

resolve_pane() {
  # Prefer explicit env; else the current termdeck master pane.
  if [ -n "${TERMDECK_COORD_PANE:-}" ]; then
    printf '%s' "$TERMDECK_COORD_PANE"; return 0
  fi
  termctl list --json 2>/dev/null | python3 -c '
import json,sys
try:
    d = json.load(sys.stdin)
    for p in d.get("data", []):
        if p.get("master"):
            print(p["id"]); break
except Exception:
    pass' 2>/dev/null
}

pane_is_pi_idle() {
  local pane="$1" tail
  tail="$(termctl peek "$pane" --lines 12 2>/dev/null)" || return 1
  [ -n "$tail" ] || return 1
  # Busy: spinner bar / "Working" within the last few lines (the chrome region).
  if printf '%s\n' "$tail" | tail -n 4 | grep -qE 'Working'; then return 1; fi
  if printf '%s\n' "$tail" | tail -n 4 | LC_ALL=C.UTF-8 grep -qP '[\x{2800}-\x{28FF}]'; then return 1; fi
  # Must look like pi idle: footer signature (usage arrows + provider/model).
  if ! printf '%s\n' "$tail" | grep -qE '\([a-zA-Z0-9-]+\) [a-zA-Z0-9._-]+ • '; then return 1; fi
  return 0
}

echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')] watching $INBOX delivery=$DELIVERY (coord pane resolved per pass)"
echo "[relay started $(date '+%Y-%m-%d %H:%M:%S')] delivery=$DELIVERY" >> "$LOG"
shopt -s nullglob
deferred=""
prev=""
while true; do
  pane="$(resolve_pane)"
  if [ -z "$pane" ]; then
    sleep 3; continue
  fi
  # Arrival log: once per newly-seen file.
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
    if [ "$DELIVERY" = "notify" ]; then
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      printf '%s NOTIFY %-22s :: %s\n' "$ts" "$(basename "$f" .ping)" "$content" | tee -a "$LOG"
      # termdeck attributes the toast to the CALLER's TERMDECK_PANE; a detached
      # process has none and the notify is silently dropped. Attribute it to the
      # master (coordinator) pane so it is visible in the deck.
      TERMDECK_PANE="$pane" termctl notify "$(basename "$f" .ping) done: $content" 2>/dev/null || true
      rm -f "$f"
    elif pane_is_pi_idle "$pane"; then
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      printf '%s DELIVER %-22s :: %s\n' "$ts" "$(basename "$f" .ping)" "$content" | tee -a "$LOG"
      termctl input "$pane" --force --paste "$content" 2>/dev/null || true
      sleep 0.4
      termctl input "$pane" --force --keys $'\r' 2>/dev/null || true
      rm -f "$f"
      deferred="$(printf '%s' "$deferred" | sed "s/$(basename "$f")//g")"
    else
      name="$(basename "$f")"
      case "$deferred" in
        *"$name"*) ;;
        *) printf '%s DEFER  %-22s :: pane=%s not idle (left for retry)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$name" "$pane" | tee -a "$LOG"
           deferred="$deferred $name";;
      esac
    fi
  done
  sleep 3
done