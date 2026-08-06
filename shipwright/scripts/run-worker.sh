#!/usr/bin/env bash

set -euo pipefail

prompt_file="${1:?usage: run-worker.sh <prompt-file> <log-file> -- <command> [args...]}"
log_file="${2:?usage: run-worker.sh <prompt-file> <log-file> -- <command> [args...]}"
shift 2
[ "${1:-}" = "--" ] || { echo "run-worker.sh: expected -- before command" >&2; exit 2; }
shift
[ "$#" -gt 0 ] || { echo "run-worker.sh: missing command" >&2; exit 2; }
[ -f "$prompt_file" ] || { echo "run-worker.sh: prompt not found: $prompt_file" >&2; exit 2; }

mkdir -p "$(dirname "$log_file")"
: > "$log_file"

set +e
"$@" < "$prompt_file" 2>&1 | tee "$log_file"
worker_status="${PIPESTATUS[0]}"
set -e

printf '__SUPERVISED_EXIT__:%s\n' "$worker_status" | tee -a "$log_file"
exit "$worker_status"
