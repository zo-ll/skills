#!/usr/bin/env bash

set -euo pipefail

usage() {
	echo 'usage: worktree.sh create <repo> <task-id> [base-ref] [path] | remove <repo> <path>' >&2
	exit 2
}

action="${1:-}"
[ -n "$action" ] || usage
shift

case "$action" in
	create)
		[ "$#" -ge 2 ] && [ "$#" -le 4 ] || usage
		repo="$(git -C "$1" rev-parse --show-toplevel)"
		task_id="$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | sed 's/^-//; s/-$//')"
		[ -n "$task_id" ] || { echo 'worktree.sh: task-id has no usable characters' >&2; exit 2; }
		base="${3:-HEAD}"
		repo_name="$(basename "$repo")"
		path="${4:-${TMPDIR:-/tmp}/agent-worktrees/$repo_name/$task_id}"
		branch="agent/$task_id"
		[ ! -e "$path" ] || { echo "worktree.sh: path exists: $path" >&2; exit 2; }
		if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
			echo "worktree.sh: branch exists: $branch" >&2
			exit 2
		fi
		mkdir -p "$(dirname "$path")"
		git -C "$repo" worktree add -b "$branch" "$path" "$base" >/dev/null
		printf 'branch=%s\nworktree=%s\nbase=%s\n' "$branch" "$path" "$(git -C "$path" rev-parse HEAD)"
		;;
	remove)
		[ "$#" -eq 2 ] || usage
		repo="$(git -C "$1" rev-parse --show-toplevel)"
		path="$2"
		[ -d "$path" ] || { echo "worktree.sh: path not found: $path" >&2; exit 2; }
		[ -z "$(git -C "$path" status --porcelain)" ] || { echo "worktree.sh: refusing dirty worktree: $path" >&2; exit 1; }
		git -C "$repo" worktree remove "$path"
		;;
	*) usage ;;
esac
