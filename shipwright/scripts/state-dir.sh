#!/usr/bin/env bash

set -euo pipefail

usage() {
	echo 'usage: state-dir.sh path <repo> <task-id> | remove <repo> <task-id>' >&2
	exit 2
}

action="${1:-}"
[ -n "$action" ] || usage
shift

case "$action" in
	path)
		[ "$#" -eq 2 ] || usage
		repo="$(git -C "$1" rev-parse --show-toplevel)"
		task_id="$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | sed 's/^-//; s/-$//')"
		[ -n "$task_id" ] || { echo 'state-dir.sh: task-id has no usable characters' >&2; exit 2; }
		printf '%s/%s/%s\n' "${TMPDIR:-/tmp}/shipwright" "$(basename "$repo")" "$task_id"
		;;
	remove)
		[ "$#" -eq 2 ] || usage
		state="$("$0" path "$1" "$2")"
		if [ -d "$state" ]; then
			rm -rf -- "$state"
			echo "removed: $state"
		fi
		;;
	*) usage ;;
esac