#!/usr/bin/env bash
# Bootstrap this repo on a new machine with pi and other coding agents.
#
# Makes every resource in this repo live everywhere:
#   1. skills/            -> symlinked into every harness skill dir (link.sh)
#   2. extensions/        -> symlinked into ~/.pi/agent/extensions/
#   3. agents/            -> symlinked into ~/.pi/agent/agents/
#
# Idempotent: safe to re-run after edits or on a fresh clone. Uses symlinks so
# the repo stays the single source of truth - edit here, live everywhere.
#
# Usage:  ./bin/bootstrap.sh

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Linking skills into all harness skill dirs"
"$REPO/scripts/link.sh"

link_tree() { # source_dir target_parent
  local src="$1" parent="$2"
  mkdir -p "$parent"
  for entry in "$src"/*; do
    [ -e "$entry" ] || continue
    local target="$parent/$(basename "$entry")"
    # Already linked to this repo?
    if [ -L "$target" ] && [ "$(readlink -f "$target")" = "$(readlink -f "$entry")" ]; then
      continue
    fi
    # Divergent local copy? Remove only what we own (real dir/file we created).
    rm -rf "$target"
    ln -s "$entry" "$target"
    echo "linked: $target"
  done
}

echo "==> Linking pi extension (subagent)"
link_tree "$REPO/harness/extensions/subagent" "$HOME/.pi/agent/extensions/subagent"

echo "==> Linking pi agents (worker, critic)"
link_tree "$REPO/harness/agents" "$HOME/.pi/agent/agents"

echo
echo "Done. In pi, run /reload (or restart) so the subagent extension and"
echo "agents are picked up. The subagent tool then spawns workers with"
echo "scoped skill manifests:"
echo "  { agent: 'worker', task: <brief>, skills: ['writing-laravel','writing-vue'], cwd: <worktree> }"
echo "  { agent: 'critic', task: <brief>, skills: ['critic','writing-laravel'], cwd: <worktree> }"