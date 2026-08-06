#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
	cat >&2 <<'EOF'
usage:
  tmux-agent.sh start <session> <window> <cwd> <prompt> <log> -- <command> [args...]
  tmux-agent.sh status <session> <window> <log>
  tmux-agent.sh capture <session> <window> [lines]
  tmux-agent.sh inspect <session:window.pane>
  tmux-agent.sh capture-target <session:window.pane> [lines]
  tmux-agent.sh prompt-target <session:window.pane> <prompt-file> <expected-command>
  tmux-agent.sh attach <session>
  tmux-agent.sh stop <session> [window]
EOF
	exit 2
}

command -v tmux >/dev/null 2>&1 || { echo "tmux-agent.sh: tmux not found" >&2; exit 2; }
action="${1:-}"
[ -n "$action" ] || usage
shift

case "$action" in
	start)
		[ "$#" -ge 7 ] || usage
		session="$1"; window="$2"; cwd="$3"; prompt="$4"; log="$5"; shift 5
		[ "${1:-}" = "--" ] || usage
		shift
		[ "$#" -gt 0 ] || usage
		[ -d "$cwd" ] || { echo "tmux-agent.sh: cwd not found: $cwd" >&2; exit 2; }
		[ -f "$prompt" ] || { echo "tmux-agent.sh: prompt not found: $prompt" >&2; exit 2; }
		if tmux has-session -t "$session" 2>/dev/null && tmux list-windows -t "$session" -F '#{window_name}' | grep -Fxq "$window"; then
			echo "tmux-agent.sh: window already exists: $session:$window" >&2
			exit 2
		fi
		printf -v run_cmd '%q ' "$script_dir/run-worker.sh" "$prompt" "$log" -- "$@"
		printf -v shell_cmd 'cd %q && %s; exec %q' "$cwd" "$run_cmd" "${SHELL:-/bin/bash}"
		if tmux has-session -t "$session" 2>/dev/null; then
			tmux new-window -d -t "$session" -n "$window" "$shell_cmd"
		else
			tmux new-session -d -s "$session" -n "$window" "$shell_cmd"
		fi
		printf 'session=%s\nwindow=%s\nlog=%s\nattach=tmux attach-session -t %s\n' "$session" "$window" "$log" "$session"
		;;
	status)
		[ "$#" -eq 3 ] || usage
		session="$1"; window="$2"; log="$3"
		if [ -f "$log" ] && grep -q '^__SUPERVISED_EXIT__:' "$log"; then
			grep '^__SUPERVISED_EXIT__:' "$log" | tail -n 1
		elif tmux has-session -t "$session" 2>/dev/null && tmux list-windows -t "$session" -F '#{window_name}' | grep -Fxq "$window"; then
			echo 'running'
		else
			echo 'missing-without-exit-marker'
			exit 1
		fi
		;;
	capture)
		[ "$#" -ge 2 ] && [ "$#" -le 3 ] || usage
		lines="${3:-120}"
		tmux capture-pane -p -S "-$lines" -t "$1:$2"
		;;
	inspect)
		[ "$#" -eq 1 ] || usage
		tmux display-message -p -t "$1" \
			'session=#{session_name}
window=#{window_name}
pane=#{pane_index}
target=#{session_name}:#{window_name}.#{pane_index}
cwd=#{pane_current_path}
command=#{pane_current_command}
pid=#{pane_pid}
dead=#{pane_dead}'
		;;
	capture-target)
		[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
		lines="${2:-120}"
		tmux capture-pane -p -S "-$lines" -t "$1"
		;;
	prompt-target)
		[ "$#" -eq 3 ] || usage
		target="$1"; prompt="$2"; expected="$3"
		[ -f "$prompt" ] || { echo "tmux-agent.sh: prompt not found: $prompt" >&2; exit 2; }
		current="$(tmux display-message -p -t "$target" '#{pane_current_command}')"
		dead="$(tmux display-message -p -t "$target" '#{pane_dead}')"
		[ "$dead" = "0" ] || { echo "tmux-agent.sh: target pane is dead: $target" >&2; exit 2; }
		[ "$current" = "$expected" ] || {
			echo "tmux-agent.sh: foreground command mismatch: expected $expected, found $current" >&2
			exit 2
		}
		buffer="shipwright-prompt-$$"
		trap 'tmux delete-buffer -b "$buffer" 2>/dev/null || true' EXIT
		tmux load-buffer -b "$buffer" "$prompt"
		tmux paste-buffer -d -b "$buffer" -t "$target"
		tmux send-keys -t "$target" Enter
		printf 'prompted=%s\ncommand=%s\n' "$target" "$current"
		;;
	attach)
		[ "$#" -eq 1 ] || usage
		echo "tmux attach-session -t $1"
		;;
	stop)
		[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
		if [ "$#" -eq 2 ]; then tmux kill-window -t "$1:$2"; else tmux kill-session -t "$1"; fi
		;;
	*) usage ;;
esac
