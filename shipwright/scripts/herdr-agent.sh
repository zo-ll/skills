#!/usr/bin/env bash

set -euo pipefail

usage() {
	cat >&2 <<'EOF'
usage:
  herdr-agent.sh start <repo> <worktree> <label> <agent-name> <kind> <prompt-file> [-- agent-args...]
  herdr-agent.sh status <agent-name>
  herdr-agent.sh wait <agent-name> [timeout-ms]
  herdr-agent.sh read <agent-name> [lines]
  herdr-agent.sh prompt <agent-name> <prompt-file> [timeout-ms]
  herdr-agent.sh review-tab <workspace-id> <worktree>
  herdr-agent.sh close <workspace-id>
EOF
	exit 2
}

command -v herdr >/dev/null 2>&1 || { echo "herdr-agent.sh: herdr not found" >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "herdr-agent.sh: jq not found" >&2; exit 2; }
action="${1:-}"
[ -n "$action" ] || usage
shift

case "$action" in
	start)
		[ "$#" -ge 6 ] || usage
		repo="$1"; worktree="$2"; label="$3"; agent="$4"; kind="$5"; prompt="$6"; shift 6
		[ -d "$worktree" ] || { echo "herdr-agent.sh: worktree not found: $worktree" >&2; exit 2; }
		[ -f "$prompt" ] || { echo "herdr-agent.sh: prompt not found: $prompt" >&2; exit 2; }
		opened="$(herdr worktree open --cwd "$repo" --path "$worktree" --label "$label" --no-focus)"
		workspace="$(printf '%s\n' "$opened" | jq -er '.result.workspace.workspace_id')"
		pane="$(printf '%s\n' "$opened" | jq -er '.result.root_pane.pane_id')"
		if [ "${1:-}" = "--" ]; then shift; fi
		if [ "$#" -gt 0 ]; then
			herdr agent start "$agent" --kind "$kind" --pane "$pane" -- "$@" >/dev/null
		else
			herdr agent start "$agent" --kind "$kind" --pane "$pane" >/dev/null
		fi
		herdr agent prompt "$agent" "$(cat "$prompt")" >/dev/null
		printf 'workspace=%s\npane=%s\nagent=%s\nworktree=%s\n' "$workspace" "$pane" "$agent" "$worktree"
		;;
	status)
		[ "$#" -eq 1 ] || usage
		herdr agent get "$1"
		;;
	wait)
		[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
		herdr agent wait "$1" --until idle --until done --until blocked --timeout "${2:-60000}"
		;;
	read)
		[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
		herdr agent read "$1" --source recent-unwrapped --lines "${2:-120}"
		;;
	prompt)
		[ "$#" -ge 2 ] && [ "$#" -le 3 ] || usage
		[ -f "$2" ] || { echo "herdr-agent.sh: prompt not found: $2" >&2; exit 2; }
		herdr agent prompt "$1" "$(cat "$2")" --wait --until idle --until done --until blocked --timeout "${3:-60000}"
		;;
	review-tab)
		[ "$#" -eq 2 ] || usage
		herdr tab create --workspace "$1" --cwd "$2" --label review --no-focus
		;;
	close)
		[ "$#" -eq 1 ] || usage
		herdr workspace close "$1"
		;;
	*) usage ;;
esac
